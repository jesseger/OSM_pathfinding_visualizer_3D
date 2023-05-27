<template>
    <div id="space">
        <div id="cont"></div>
    </div>
</template>

<script>

import * as THREE from 'three'
import * as GEOLIB from 'geolib'
import { MapControls } from 'three/addons/controls/MapControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

import Stats from 'three/addons/libs/stats.module.js';

export default {
    name: 'space',
    props:{
        isPedestrian: false,
        intersections: null,
    },
    data(){
        return{ 
            CENTER: [6.08379, 50.77539],
            MAT_BUILDING: null,
            MAT_ROAD: null,
            MAT_FOOTPATH: null,
            stats: null,
            geos_building: [],
            prevIsPedestrian: false,
        }
    },
    mounted(){
        this.Awake()

        const that = this

        //when user resizes window
        window.addEventListener('resize', onWindowResize, false)
        function onWindowResize(){
            that.camera.aspect = window.innerWidth / window.innerHeight
            that.camera.updateProjectionMatrix()
            that.renderer.setSize(window.innerWidth, window.innerHeight)
        }

        onWindowResize()

        //when user alt+clicks to select building
        document.getElementById("cont").addEventListener('click', (e)=>{
            if(!e.altKey) return
            const pointer = {
                x: ( e.clientX / window.innerWidth ) * 2 - 1,
	            y: - ( e.clientY / window.innerHeight ) * 2 + 1,
            }

            const hitObject = that.FireRaycaster(pointer)
            if(hitObject["props"]){
                this.scene.add(hitObject)
            }
        })
    },
    watch : {
        intersections: {
            handler(val, oldVal){
                const MAT_NODE = new THREE.MeshBasicMaterial( { color: 0xff4300 } );

                const nodes = []
                
                for(let intersection of this.intersections.values()){
                    const coords = this.GPSRelativePosition(intersection.coords, this.CENTER)
                    const geometry = new THREE.BoxGeometry( .02, 0.2, .02 );
                    geometry.translate(coords[0],0,coords[1])
                    nodes.push(geometry)
                }

                const mergedGeometry = BufferGeometryUtils.mergeGeometries(nodes) 
                mergedGeometry.rotateZ(Math.PI)
                const mesh = new THREE.Mesh(mergedGeometry, MAT_NODE)
                this.scene.add(mesh)
            },
            deep: true,
        },
    },
    updated(){

    },
    methods: {
        Awake(){
            let cont = document.getElementById("cont")
            
            //init scene
            this.scene = new THREE.Scene()
            this.scene.background = new THREE.Color(0x222222)

            //init camera
            this.camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 100)
            this.camera.position.set(5,5,-5)
            this.camera.updateProjectionMatrix()

            //init groups
            this.iR = new THREE.Group()
            this.iR.name = "Interactive Root"

            this.iR_roads = new THREE.Group()
            this.iR_roads.name = "Roads"

            this.iR_footpaths = new THREE.Group()
            this.iR_footpaths.name = "Footpaths"

            this.stored_roads = null

            this.$nextTick(()=>{
                this.scene.add(this.iR)
                this.scene.add(this.iR_roads)
            })

            // init lights
            const light0 = new THREE.AmbientLight(0xfafafa, 0.25)

            const light1 = new THREE.PointLight(0xfafafa, 0.4)
            light1.position.set(200, 90, 40)

            const light2 = new THREE.PointLight(0xfafafa, 0.4)
            light2.position.set(200, 90, -40)

            this.scene.add(light0)
            this.scene.add(light1)
            this.scene.add(light2)

            const gridHelper = new THREE.GridHelper(60, 150, new THREE.Color(0x555555), new THREE.Color(0x333333))
            this.scene.add(gridHelper)

            //init renderer
            this.renderer = new THREE.WebGLRenderer({antialias: true})
            this.renderer.setPixelRatio(window.devicePixelRatio)
            this.renderer.setSize(window.innerWidth, window.innerHeight)

            cont.appendChild(this.renderer.domElement)

            this.controls = new MapControls(this.camera, this.renderer.domElement)
            this.controls.enableDamping = true
            this.controls.screenSpacePanning = true
            this.controls.minPolarAngle = Math.PI / 4
            this.controls.maxPolarAngle = Math.PI / 4
            this.controls.dampingFactor = 0.25
            this.controls.screenSpacePanning = false
            this.controls.maxDistance = 800
            this.controls.update()

            this.stats = new Stats()
            cont.appendChild(this.stats.dom)

            this.MAT_BUILDING = new THREE.MeshPhongMaterial()

            this.MAT_ROAD = new THREE.LineBasicMaterial({color: 0x03ffe6})
            this.MAT_FOOTPATH = new THREE.LineBasicMaterial({color: 0x66FF00})

            //init raycasting
            this.raycaster = new THREE.Raycaster()
            this.colliders = []

            this.Update()

            this.GetGeoJson()
        },
        Update(){
            requestAnimationFrame(this.Update)

            this.renderer.render(this.scene, this.camera)
            this.controls.update()
            this.stats.update()
        },
        /**
         * Fetches GeoJSON file. 
         */
        GetGeoJson(){
            fetch('./assets/aachen_zentrum_buildings_highways.geojson').then((res)=>{
                res.json().then((data)=>{
                    this.LoadGeoData(data)
                })
            })
        },
        /**
         * Turns OSM data JSON into 3D model
         * @param {json} data GeoJSON file retrieved through Overpass API
         */
        LoadGeoData(data){
            const highwayData = {} 

            let features = data.features
            for(let i=0;i<features.length;i++){

                let fel = features[i]
                if(!fel["properties"]) return
                if(fel.properties["building"] || fel.properties["building:part"]){
                    this.addBuilding(fel.geometry.coordinates, fel.properties)
                }
                else if(fel.properties["highway"] && fel.geometry.type == "LineString"){
                    let isRoad=false, isFootpath=false
                    if(!["pedestrian","path","bridleway","cycleway","footway","footway","track"].includes(fel.properties.highway)){
                        this.addHighway(fel.geometry.coordinates, fel.properties, true)
                        isRoad=true
                    }
                    if(!["motorway","bridleway","cycleway"].includes(fel.properties.highway) ){
                        this.addHighway(fel.geometry.coordinates, fel.properties, false)
                        isFootpath=true
                    }
                    if(isRoad || isFootpath){
                        highwayData[fel.properties["@id"]] = {
                            array: new Float32Array(fel.geometry.coordinates.flat()),
                            isRoad: isRoad,
                            isFootpath: isFootpath,
                        }
                    }
                }
            }

            //Add buildings to scene
            const that = this
            this.$nextTick(()=>{
                const mergedGeometry = BufferGeometryUtils.mergeGeometries(that.geos_building) 
                const mesh = new THREE.Mesh(mergedGeometry, that.MAT_BUILDING)
                this.iR.add(mesh)
            })

            this.$emit("sendHighwayData", highwayData)
        },
        /**
         * Takes coordinates and metainformation of a highway (e.g. road, sidewalk) and turns it into 3D line
         * @param {array} coords Coordinates of the highway
         * @param {object} props Properties of the highway
         * @param {boolean} isRoad Whether the highway is a road or a footpath
         */
        addHighway(coords, props, isRoad = true){
            const points = []
            
            if(!coords[0][1]) return 

            for(let i=0;i<coords.length;i++){ 
                const el = coords[i]

                if(!el[0] || !el[1]) return 

                let elp = [el[0],el[1]]
                elp = this.GPSRelativePosition(elp, this.CENTER)
                points.push(new THREE.Vector3(elp[0], 0, elp[1]))
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            geometry.rotateZ(Math.PI)

            const randomColor = Math.floor(Math.random()*16777215)
            const randomMat = new THREE.LineBasicMaterial({color: randomColor})
            const line = new THREE.Line(geometry, randomMat)
            line.props = props
            line.computeLineDistances()

            isRoad? this.iR_roads.add(line) : this.iR_footpaths.add(line)
            line.position.set(line.position.x, 0, line.position.z)
        },
        /**
         * Takes coordinates and information of a building outline and turns it into 3D object
         * @param {array} coords Coordinates of the outline
         * @param {object} props Properties (e.g. height, usage, name) of building
         */
        addBuilding(coords, props){
            const random = 0.90 + Math.random()*0.2 //height noise
            let height = 10*random
            if(props["height"]){ height = props["height"]}
            else if(props["building:levels"]){ height = 4*props["building:levels"]*random}
            else if(["apartments","office","university","commercial"].includes(props["building"])) { height = 25*random}

            //generate shape and punch holes into it if necessary
            const shape = this.genShape(coords[0], this.CENTER)
            for(let i=1;i<coords.length;i++){
                const hole = this.genShape(coords[i], this.CENTER)
                shape.holes.push(hole)
            }

            const geometry = this.genGeometry(shape, {curveSegments: 1, depth: 0.007 * height, bevelEnabled: false})
            geometry.rotateX(Math.PI / 2) //TODO maybe rotate every single geometry at the end instead?
            geometry.rotateZ(Math.PI)

            this.geos_building.push(geometry)

            const helper = this.genHelper(geometry)

            if(helper){
                helper.name = props["name"]? props["name"] : "Building" //TODO Maybe address as fallback
                helper.props = props
                this.colliders.push(helper)
            }
        },
        /**
         * Wraps a bounding box helper around our object which we can use for visualization
         * @param {object} geometry 
         */
        genHelper(geometry){
            if(!geometry.boundingBox){
                geometry.computeBoundingBox()
            }

            const box3 = geometry.boundingBox
            if(!isFinite(box3.max.x)){
                return false
            }

            let helper = new THREE.Box3Helper(box3, 0xffff00)
            helper.updateMatrixWorld(true)
            return helper
        },
        /**
         * Creates 2D shape in coordinate space from outline points
         * @param {array} points The points making up the outline 
         * @param {array} center The two coordinates definining the (arbitrary) center of our scene
         */
        genShape(points, center){
            const shape = new THREE.Shape()

            for(let i=0; i<points.length;i++){
                const elp = this.GPSRelativePosition(points[i], center)

                if(i==0){ shape.moveTo(elp[0], elp[1])}
                else{ shape.lineTo(elp[0], elp[1])}
            }
            return shape
        },
        /**
         * Extrudes given 2D shape into 3D geometry
         * @param {object} shape The 2D shape to be extruded
         * @param {object} config The extrusion method settings
         */
        genGeometry(shape, config){
            const geometry = new THREE.ExtrudeGeometry(shape, config)
            geometry.computeBoundingBox() 
            return geometry
        },
        /**
         * Fires raycaster along the mouse pointer and returns first BoxHelper hit
         * @param {object} pointer The x,y pointer defined by our mouse position
         */
        FireRaycaster(pointer){
            this.raycaster.setFromCamera(pointer, this.camera)
            this.raycaster.params.Line.threshold = 0.01
            let intersects = this.raycaster.intersectObjects(this.colliders, false)
            if(intersects.length>0){
                return intersects[0].object
            } 
            else{
                return false
            }
        },
        /**
         * Converts latitude/longitude points into 2D points in coordinate space
         * This is necessary, as working directly with lat/long would cause distortion in some directions
         * @param {array} objPos [lat, long] coordinates of a point
         * @param {array} centerPos [lat, long] coordinates of (arbitrary) center point 
         */
        GPSRelativePosition(objPos, centerPos) {
            // Get GPS distance
            const dist = GEOLIB.getDistance(objPos, centerPos)

            // Get bearing angle
            const bearing = GEOLIB.getRhumbLineBearing(objPos, centerPos)

            // Calculate X by centerPosi.x + distance * cos(rad)
            const x = centerPos[0] + (dist * Math.cos(bearing * Math.PI / 180))

            // Calculate Y by centerPosi.y + distance * sin(rad)
            const y = centerPos[1] + (dist * Math.sin(bearing * Math.PI / 180))

            // Reverse X
            return [-x / 100, y / 100]
        }
    }
}
</script>

<style scoped>

</style>