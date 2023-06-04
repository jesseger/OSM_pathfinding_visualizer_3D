<template>
    <div id="space">
        <div id="cont"></div>
    </div>
</template>

<script>

import * as THREE from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

import Stats from 'three/addons/libs/stats.module.js';

import { GPSRelativePosition, coordStringToArray } from '../assets/js/utils';

import { useTheme } from 'vuetify'

export default {
    name: 'space',
    props:{
        isPedestrian: {
            type: Boolean,
            default: () => false
        },
        isBuildingsVisible: Boolean,
        intersections: Object,
        edges: Object,
        centerCoords: Array,
        animationData: Array,
        shortestPath: Array,
        isWeightedAlgo: Boolean,
        toggleResetScene: Boolean,
    },
    data(){
        return{ 
            MAT_BUILDING: null,
            MAT_ROAD: null,
            MAT_FOOTPATH: null,
            stats: null,
            geos_building: [],
            edgesMap: new Map(),
            theme: useTheme(),
        }
    },
    mounted(){
        this.Awake()

        //when user resizes window
        const that = this
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

            const hitObject = this.FireRaycaster(pointer)
            if(hitObject){
                if(!this.selectedStart){
                    this.selectedStart = hitObject
                    this.scene.add(hitObject)
                }
                else if(!this.selectedGoal){
                    if(this.selectedStart == hitObject){
                        this.selectedStart = null
                        this.scene.remove(hitObject)
                    } else{
                        this.selectedGoal = hitObject
                        this.scene.add(hitObject)
                    }
                }
                else{
                    if(this.selectedGoal == hitObject){
                        this.selectedGoal = null
                        this.scene.remove(hitObject)
                    }
                }
                this.updateSelection()
            }
        })
    },
    watch : {
        intersections: {
            handler(val, oldVal){
                this.intersection_colliders = []
                const MAT_NODE = new THREE.MeshBasicMaterial( { color: this.theme.global.current.colors.secondary } )    
                
                for(let stringCoords of this.intersections.keys()){
                    const coords = GPSRelativePosition(coordStringToArray(stringCoords), this.centerCoords)
                    const geometry = new THREE.SphereGeometry( 0.1, 13, 13 )
                    geometry.translate(coords[0],0,coords[1])
                    geometry.rotateZ(Math.PI)

                    const sphere = new THREE.Mesh(geometry, MAT_NODE)
                    sphere.name = coords.toString()

                    this.intersection_colliders.push(sphere)
                }
            },
            deep: true,
        },
        edges: {
            handler(val, oldVal){
                
                const iR_edges = new THREE.Group()
                iR_edges.name = "edges"

                for(let node1 of this.edges.keys()){
                    const coords1 = coordStringToArray(node1)
                    for(let edge of this.edges.get(node1)){

                        const node2 = edge.neighbor 
                        const coords2 = coordStringToArray(node2)

                        const point1 = new THREE.Vector3(coords1[0],0,coords1[1])
                        const point2 = new THREE.Vector3(coords2[0],0,coords2[1])
                        const geometry = new THREE.BufferGeometry().setFromPoints([point1, point2])
                        geometry.rotateZ(Math.PI)

                        const line = new THREE.Line(geometry, this.MAT_EDGE)
                        line.name = [node1,node2].toString()
                        this.edgesMap.set([node1,node2].toString(), line)
                        iR_edges.add(line)
                   	}
                }       
                
                //Remove old edges if they exist
                const selectedObject = this.scene.getObjectByName("edges");
                if(selectedObject){
                    this.scene.remove( selectedObject );
                }
                //Add new edges
                this.scene.add(iR_edges) 
            
            },
            deep: true,
        },
        isPedestrian: {
            handler(val, oldVal){
                this.resetSelection()
            }
        },
        animationData: {
            handler(val, oldVal){
                //Add new edge to frontierEdge
                //const MAT_FRONTIER = new THREE.LineDashedMaterial( {color: this.theme.global.current.colors.primary, gapSize: 0.05, dashSize: 0.02}) // 0xFFE921 0xffdd80

                if(val[1]){
                    const unvisitedEdge = this.edgesMap.get([val[0],val[1]].toString())
                    unvisitedEdge.computeLineDistances() 
                    unvisitedEdge.material = this.MAT_FRONTIER
                }                

                //Edge that we took to currentNode is now visited
                if(val[2]){
                    const selectedEdge = this.edgesMap.get([val[2],val[0]].toString())

                    let lightness
                    if(this.isWeightedAlgo){
                        const factor = 2
                        lightness = 50 + 50 * Math.min((factor / val[3]), 1) //Color changes based on euclidean dist. to start
                    }
                    else {
                        lightness = Math.max(50, 100 - 2*val[3])
                    }

                    const COLOR_VISITED = new THREE.Color(`hsl(18, 100%, ${lightness}%)`)
                    const MAT_VISITED = new THREE.LineBasicMaterial( {linewidth: 2, color: COLOR_VISITED } )

                    selectedEdge.material = MAT_VISITED
                }
            
            },
            deep: true,
        },  
        shortestPath: {
            handler(val, oldVal){
                for(let edge of this.shortestPath){
                    const selectedEdge = this.scene.getObjectByName(edge.toString());
                    const MAT_SHORTEST = new THREE.LineBasicMaterial( {linewidth: 1, color: this.theme.global.current.colors.secondary} )
                    selectedEdge.material = MAT_SHORTEST
                }
            },
            deep: true,
        },
        toggleResetScene:{
            handler(val, oldVal){
                this.resetAnimation()
            }
        },
        isBuildingsVisible:{
            handler(val, oldVal){
                if(val){
                    this.scene.add(this.iR)
                }
                else{
                    this.scene.remove(this.iR)
                }
            }
        },
    },
    methods: {
        Awake(){
            let cont = document.getElementById("cont")
            
            //init scene
            this.scene = new THREE.Scene()
            this.scene.background = new THREE.Color(0x222222)

            //init camera
            this.camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 50)
            this.camera.position.set(5,5,-5)
            this.camera.updateProjectionMatrix()

            //init groups
            this.iR = new THREE.Group()
            this.iR.name = "Interactive Root"

            this.iR_roads = new THREE.Group()
            this.iR_roads.name = "Roads"

            this.iR_footpaths = new THREE.Group()
            this.iR_footpaths.name = "Footpaths"

            this.$nextTick(()=>{
                this.scene.add(this.iR)
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

            //const gridHelper = new THREE.GridHelper(60, 150, new THREE.Color(0x555555), new THREE.Color(0x333333))
            //this.scene.add(gridHelper)

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
            this.controls.maxDistance = 20
            this.controls.minDistance = 1
            this.controls.update()

            this.stats = new Stats()
            cont.appendChild(this.stats.dom)

            this.MAT_BUILDING = new THREE.MeshPhongMaterial()

            this.MAT_ROAD = new THREE.LineBasicMaterial({color: 0x03ffe6})
            this.MAT_FOOTPATH = new THREE.LineBasicMaterial({color: 0x66FF00})

            //init raycasting
            this.raycaster = new THREE.Raycaster()
            this.intersection_colliders = []

            this.selectedStart = null
            this.selectedGoal = null

            //Animation
            this.MAT_FRONTIER = new THREE.LineDashedMaterial( {color: this.theme.global.current.colors.primary, gapSize: 0.05, dashSize: 0.02})
            this.MAT_EDGE = new THREE.LineBasicMaterial({ color: this.theme.global.current.colors['secondary-darken-2']}) 

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
            this.$nextTick(()=>{
                const mergedGeometry = BufferGeometryUtils.mergeGeometries(this.geos_building) 
                const mesh = new THREE.Mesh(mergedGeometry, this.MAT_BUILDING)
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
                elp = GPSRelativePosition(elp, this.centerCoords)
                points.push(new THREE.Vector3(elp[0], 0, elp[1]))
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            geometry.rotateZ(Math.PI)

            const randomColor = Math.floor(Math.random()*16777215)
            const randomMat = new THREE.LineBasicMaterial({color: randomColor})
            const line = new THREE.Line(geometry, randomMat)
            line.props = props

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
            const shape = this.genShape(coords[0], this.centerCoords)
            for(let i=1;i<coords.length;i++){
                const hole = this.genShape(coords[i], this.centerCoords)
                shape.holes.push(hole)
            }

            const geometry = this.genGeometry(shape, {curveSegments: 1, depth: 0.007 * height, bevelEnabled: false})
            geometry.rotateX(Math.PI / 2) 
            geometry.rotateZ(Math.PI)

            this.geos_building.push(geometry)
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
                const elp = GPSRelativePosition(points[i], center)

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
         * Fires raycaster along the mouse pointer and returns first intersection object hit
         * @param {object} pointer The x,y pointer defined by our mouse position
         */
        FireRaycaster(pointer){
            this.raycaster.setFromCamera(pointer, this.camera)
            const intersects = this.raycaster.intersectObjects(this.intersection_colliders, false)
            if(intersects.length>0){
                return intersects[0].object
            } 
            else{
                return false
            }
        },
        resetAnimation(){
            console.log("Reset animation called")
            for(let [key, line] of this.edgesMap.entries()){
                line.material = this.MAT_EDGE
            }
        },
        resetSelection(){
            this.scene.remove(this.selectedStart)
            this.scene.remove(this.selectedGoal)
            this.selectedStart = null
            this.selectedGoal = null
            this.updateSelection()
        },
        updateSelection(){
            this.$emit('sendSelectedNodes', {
                start: this.selectedStart? this.selectedStart.name : null,
                goal: this.selectedGoal? this.selectedGoal.name : null,
            })
        },
    }
}
</script>

<style scoped>

</style>