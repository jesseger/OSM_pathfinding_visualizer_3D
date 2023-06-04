import { GPSRelativePosition, coordStringToArray } from './utils'

var roadIntersections = new Map() //Format: map["x,y"] = Set(way1, way2, (way3),...)
var footpathIntersections = new Map() //Format: map["x,y"] = Set(way1, way2, (way3),...)

var roadEdges = new Map()
var footpathEdges = new Map()

var centerCoords = null 

const equal2D = (arr1, arr2) => arr1[0] === arr2[0] && arr1[1] === arr2[1] 

/**
 * Computes graph (nodes and edges) from highway data in a background process
 * @param {object} e Event. e.data has format {centerCoords: string, highwayData: map}
 */
onmessage = (e) => {
    console.log("Worker started")

    centerCoords = coordStringToArray(e.data.centerCoords)

    computeLineIntersections(e.data.highwayData)

    console.log(roadIntersections)
    console.log(footpathIntersections)

    postMessage({
        roadIntersections: roadIntersections,
        footpathIntersections: footpathIntersections,
        roadEdges: null,
        footpathEdges: null,
    })

    computeEdges(e.data.highwayData, true)
    computeEdges(e.data.highwayData, false)
    console.log(roadEdges)
    console.log(footpathEdges)

    postMessage({
        roadIntersections: roadIntersections,
        footpathIntersections: footpathIntersections,
        roadEdges: roadEdges,
        footpathEdges: footpathEdges,
    })
}
/**
 * Computes edges of graph, given highway data 
 * @param {object} data Map like data[id] = {array: array, isRoad: boolean, isFootpath: boolean}
 * @param {boolean} isRoad Whether edges shall be derived from roads or footpaths
 */
function computeEdges(data, isRoad){
    const intersections = isRoad? roadIntersections : footpathIntersections

    //Iterate over every way "way"
    const wayList = Object.keys(data) 
    for(let i=0; i<wayList.length;i++){
        const way = wayList[i] // e.g. "way/1234"


        const nodeList = [] //store all intersections that lie on way
        const keyList = [] //store the keys corresponding to these nodes

        for(let [iKey, obj] of intersections.entries()){
            const waysSet = obj.ways
            if(waysSet.has(way)){
                //Add intersection to nodeList of way (if not in there yet)

                let includes = false //TODO kind of a bad pattern, maybe improve
                for(let i=0;i<nodeList.length;i++){
                    const iCoords = obj.coords
                    const nodeCoords = nodeList[i]
                    if(equal2D(iCoords, nodeCoords)){
                        includes = true
                        break
                    }
                }
                if(!includes){
                    nodeList.push(obj.coords)
                    keyList.push(iKey)
                }
            }
        }

        //Derive edges between nodes on way
        const nodeListLength = nodeList.length
        if(nodeListLength <2){
            //  way like -----O or -----
            continue
        }
        else if(nodeListLength == 2){
            //  way like O-----O
            addEdge(nodeList, keyList, isRoad)
        }
        else{
            // way like O--O--O--O
            /*
                Approach: We compute the distance between each pair of nodes. A node in a maximum distance pair must be an "endpoint".
                Then we sort the nodes by distance to this endpoint. Create edge (n_i, n_i+1) for successive nodes in this sorted list.
            */
            let distances = []
            for(let i=0;i<nodeListLength;i++){
                for(let j=i+1;j<nodeListLength;j++){
                    const coords1 = nodeList[i] 
                    const coords2 = nodeList[j]

                    const squaredDist =  (coords1[0] - coords2[0]) ** 2 + (coords1[1] - coords2[1]) ** 2

                    distances.push({
                        dist: squaredDist,
                        coords1: coords1,
                        coords2: coords2,
                        key1: keyList[i],
                        key2: keyList[j],
                    })  
                }
            }

            //Sort node pairs on way by distance, asc.
            distances.sort((a,b) => {
                return a.dist > b.dist ? 1 : -1
            })


            const start = distances[distances.length-1] //start.coords1 is our reference endpoint

            //Pairs that do not contain endpoint are irrelevant
            distances = distances.map((obj) => {
                return equal2D(obj.coords1, start.coords1) || equal2D(obj.coords2, start.coords2)? obj : undefined
            })

            distances.sort((a,b) => {
                return a.dist > b.dist ? 1 : -1
            })

            let node_0_coords, node_0_key
            if(equal2D(distances[0].coords1, start.coords1)){
                node_0_coords = distances[0].coords2
                node_0_key = distances[0].key2
            }
            else{
                node_0_coords = distances[0].coords1
                node_0_key = distances[0].key1
            }

            addEdge([start.coords1, node_0_coords], [start.key1, node_0_key], isRoad)

            for(let i=0;i<nodeListLength-2;i++){
                const j = i+1
                //const coords_i = equal2D(distances[i].coords1, start)? distances[i].coords2 : distances[i].coords1
                let coords_i,key_i
                if(equal2D(distances[i].coords1, start.coords1)){
                    coords_i = distances[i].coords2
                    key_i = distances[i].key2
                }
                else{
                    coords_i = distances[i].coords1
                    key_i = distances[i].key1
                }
                //const coords_j = equal2D(distances[j].coords1, start)? distances[j].coords2 : distances[j].coords1
                let coords_j,key_j
                if(equal2D(distances[j].coords1, start.coords1)){
                    coords_j = distances[j].coords2
                    key_j = distances[j].key2
                }
                else{
                    coords_j = distances[j].coords1
                    key_j = distances[j].key1
                }

                addEdge([coords_i, coords_j],[key_i, key_j], isRoad)
            }
        }
    }
}
/**
 * 
 * @param {string} coords1 [x,y] world coordinates of node 1
 * @param {string} coords2 [x,y] world coordinates of node 2
 * @param {int} key1 key of node 1 in intersection sets
 * @param {int} key2 key of node 2 in intersection sets
 * @param {boolean} isRoad Whether edge belongs to a road or a footpath
 */
function addEdge([coords1,coords2], [key1,key2], isRoad){
    const edgesMap = isRoad ? roadEdges : footpathEdges

    //sqrt is relevant for pathfinding
    const dist = Math.sqrt((coords1[0] - coords2[0]) ** 2 + (coords1[1] - coords2[1]) ** 2)

    //Store edges as "undirected" so we can get list of adjacent nodes in O(1)
    const node1Edges = edgesMap.get(key1)
    const node2Edges = edgesMap.get(key2)

    if(!node1Edges){
        edgesMap.set(key1, [{dist: dist, neighbor: key2}])
    }
    else {
        node1Edges.push({dist: dist, neighbor: key2})
    }

    if(!node2Edges){
        edgesMap.set(key2, [{dist: dist, neighbor: key1}])
    }
    else {
        node2Edges.push({dist: dist, neighbor: key1})
    }
}
/**
 * Computes all intersections between highways
 * @param {object} data Highway data of the form data[id] = { array, isRoad, isFootpath }
 */
function computeLineIntersections(data){
    const start = Date.now();

    let numIntersections = 0
    const keyList = Object.keys(data)

    for(let i=0; i<keyList.length;i++){
        const i_key = keyList[i] 
        for(let j=i+1; j<keyList.length;j++){
            const j_key = keyList[j]

            const linePoints1 = data[i_key].array
            const linePoints2 = data[j_key].array
            const isRoad = data[i_key].isRoad && data[j_key].isRoad
            const isFootpath = data[i_key].isFootpath && data[j_key].isFootpath
            //Only have to compute intersection if lines are either both road or both footpath
            if(isRoad || isFootpath){
                numIntersections = getLineIntersection(linePoints1, linePoints2, i_key, j_key, isRoad, isFootpath, numIntersections)
            }
            
        }
    }
    const timeTaken = Date.now() - start;
    console.log(`Found ${numIntersections} intersections of highways in ${timeTaken} ms`)
    return true
}
/**
 * Computes the intersection point between two 2D lines (lat./long.), if it exists
 * This method has so many arguments, because I have no guarantee that 2 line segments have only 1 intersection
 * Therefore, I did not want to simply return the first one
 * @param {Float32Array} linePoints1 Points of first line, x- and z-coordinates alternating
 * @param {Float32Array} linePoints2 Points of second line, x- and z-coordinates alternating
 * @param {string} key1 Key of first line
 * @param {string} key2 Key of second line
 * @param {boolean} isRoad Whether these points belong to a road
 * @param {boolean} isFootpath Whether these points belong to a footpath
 * @param {int} numIntersections Keeps track of how many intersections have been found
 */
function getLineIntersection(linePoints1, linePoints2, key1, key2, isRoad, isFootpath, numIntersections){
    for (let m=3; m<linePoints1.length;m+=2){
        for(let n=3; n<linePoints2.length;n+=2){
            const A_x = linePoints1[m-3]
            const A_z = linePoints1[m-2]
            const B_x = linePoints1[m-1]
            const B_z = linePoints1[m]

            const C_x = linePoints2[n-3]
            const C_z = linePoints2[n-2]
            const D_x = linePoints2[n-1]
            const D_z = linePoints2[n]

            const intersection = getLineSegmentIntersection(A_x,A_z,B_x,B_z,C_x,C_z,D_x,D_z)
            
            if(intersection){
                const iCoords = GPSRelativePosition(intersection, centerCoords)
                if(isRoad){
                    let didExist = false
                    for(let [key, existingIntersection] of roadIntersections.entries()){
                        if(iCoords[0] === existingIntersection.coords[0] && iCoords[1] === existingIntersection.coords[1]){
                            existingIntersection.ways.add(key1) 
                            existingIntersection.ways.add(key2)
                            didExist = true
                            break
                        }
                    }
                    if(!didExist){
                        const s = new Set([key1,key2])
                        roadIntersections.set(numIntersections, {
                            coords: iCoords,
                            ways: s,
                        })
                    }
                }
                if(isFootpath){
                    let didExist = false
                    for(let [key, existingIntersection] of footpathIntersections.entries()){
                        if(iCoords[0] === existingIntersection.coords[0] && iCoords[1] === existingIntersection.coords[1]){
                            existingIntersection.ways.add(key1)
                            existingIntersection.ways.add(key2)
                            didExist = true
                            break
                        }
                    }
                    if(!didExist){
                        const s = new Set([key1,key2])
                        footpathIntersections.set(numIntersections, {
                            coords: GPSRelativePosition(intersection, centerCoords),
                            ways: s,
                        })
                    }
                }
                numIntersections++ 
            }
        }
    }
    return numIntersections
}
/**
 * Computes intersection [x,y] of two 2D line segments. The segments are AB and CD.
 * @param {number} A_x 
 * @param {number} A_y 
 * @param {number} B_x 
 * @param {number} B_y 
 * @param {number} C_x 
 * @param {number} C_y 
 * @param {number} D_x 
 * @param {number} D_y 
 */
function getLineSegmentIntersection(A_x, A_y, B_x, B_y, C_x, C_y, D_x, D_y) {
    let s1_x, s1_y, s2_x, s2_y; 
    s1_x = B_x - A_x; 
    s1_y = B_y - A_y; 
    s2_x = D_x - C_x; 
    s2_y = D_y - C_y; 

    //TODO make sure the determinant is not 0. Doesn't seem relevant for our data though.
    let s, t; 
    s = (-s1_y * (A_x - C_x) + s1_x * (A_y - C_y)) / (-s2_x * s1_y + s1_x * s2_y); 
    t = ( s2_x * (A_y - C_y) - s2_y * (A_x - C_x)) / (-s2_x * s1_y + s1_x * s2_y);  

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) { 
        const x = A_x + (t * s1_x); 
        const y = A_y + (t * s1_y); 
        return [x, y]; 
    } 
    return false;
}