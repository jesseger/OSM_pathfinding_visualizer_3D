import { GPSRelativePosition, coordStringToArray } from './utils'

var roadIntersections = new Map() //Format: map["x,y"] = Set(way1, way2, (way3),...)
var footpathIntersections = new Map() //Format: map["x,y"] = Set(way1, way2, (way3),...)

var roadEdges = new Map()
var footpathEdges = new Map()

var centerCoords = null 

/**
 * Computes graph (nodes and edges) from highway data in a background process
 * @param {object} e Event. e.data has format {centerCoords: string, highwayData: map}
 */
onmessage = (e) => {
    console.log("Worker started")

    centerCoords = coordStringToArray(e.data.centerCoords)

    computeLineIntersections(e.data.highwayData)

    postMessage({
        roadIntersections: roadIntersections,
        footpathIntersections: footpathIntersections,
        roadEdges: null,
        footpathEdges: null,
    })

    computeEdges(e.data.highwayData, true)
    computeEdges(e.data.highwayData, false)

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
    const keyList = Object.keys(data) 
    for(let i=0; i<keyList.length;i++){
        const way = keyList[i] // e.g. "way/1234"
        const s = new Set()

        //Store all the nodes intersecting with way in s
        for(let [stringCoords, waysSet] of intersections.entries()){
            if(waysSet.has(way)){
                s.add(stringCoords)
            }
        }

        //Derive edges between nodes on way
        const setSize = s.size
        if(setSize <2){
            //  way like -----O or -----
            continue
        }
        else if(setSize == 2){
            //  way like O-----O
            addEdge([...s], isRoad)
        }
        else{
            // way like O--O--O--O
            /*
                Approach: We compute the distance between each pair of nodes. A node in a maximum distance pair must be an "endpoint".
                Then we sort the nodes by distance to this endpoint. Create edge (n_i, n_i+1) for successive nodes in this sorted list.
            */
            let distances = []
            for(let i=0;i<setSize;i++){
                for(let j=i+1;j<setSize;j++){
                    const node1 = [...s][i]
                    const node2 = [...s][j]

                    if(node1 === node2){
                        continue
                    }
                    
                    const longLatCoords1 = coordStringToArray(node1)
                    const longLatCoords2 = coordStringToArray(node2)
                    const coords1 = GPSRelativePosition(longLatCoords1, centerCoords)
                    const coords2 = GPSRelativePosition(longLatCoords2, centerCoords)

                    const squaredDist =  (coords1[0] - coords2[0]) ** 2 + (coords1[1] - coords2[1]) ** 2

                    distances.push({
                        dist: squaredDist,
                        node1: node1,
                        node2: node2,
                    })  
                }
            }

            //Sort node pairs on way by distance, asc.
            distances.sort((a,b) => {
                return a.dist > b.dist ? 1 : -1
            })

            const start = distances[distances.length-1].node1

            //Pairs that do not contain endpoint are irrelevant
            distances = distances.map((obj) => {
                return (obj.node1 == start || obj.node2 == start)? obj : undefined
            })

            distances.sort((a,b) => {
                return a.dist > b.dist ? 1 : -1
            })

            const node_0 = distances[0].node1 === start? distances[0].node2 : distances[0].node1
            addEdge([start, node_0], isRoad)
            for(let i=0;i<setSize-2;i++){
                const j = i+1
                const node_i = distances[i].node1 === start? distances[i].node2 : distances[i].node1
                const node_j = distances[j].node1 === start? distances[j].node2 : distances[j].node1

                addEdge([node_i, node_j], isRoad)
            }
        }
    }
}
/**
 * 
 * @param {string} node1 "x,y" coordinates of node 1
 * @param {string} node2 "x,y" coordinates of node 2
 * @param {boolean} isRoad Whether edge belongs to a road or a footpath
 */
function addEdge([node1,node2], isRoad){
    const edgesMap = isRoad ? roadEdges : footpathEdges

    const longLatCoords1 = coordStringToArray(node1)
    const longLatCoords2 = coordStringToArray(node2)
    const coords1 = GPSRelativePosition(longLatCoords1, centerCoords)
    const coords2 = GPSRelativePosition(longLatCoords2, centerCoords)

    //sqrt is relevant for pathfinding
    const dist = Math.sqrt((coords1[0] - coords2[0]) ** 2 + (coords1[1] - coords2[1]) ** 2)

    //Store edges as "undirected" so we can get list of adjacent nodes in O(1)
    const node1Edges = edgesMap.get(coords1.toString())
    const node2Edges = edgesMap.get(coords2.toString())

    if(!node1Edges){
        edgesMap.set(coords1.toString(), [{dist: dist, neighbor: coords2.toString()}])
    }
    else {
        node1Edges.push({dist: dist, neighbor: coords2.toString()})
    }

    if(!node2Edges){
        edgesMap.set(coords2.toString(), [{dist: dist, neighbor: coords1.toString()}])
    }
    else {
        node2Edges.push({dist: dist, neighbor: coords1.toString()})
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
                if(isRoad){
                    const intersectingRoadsSet = roadIntersections.get(intersection.toString())
                    if(!intersectingRoadsSet){
                        //If this point is new, make a new Set of ways for it
                        const s = new Set([key1,key2])
                        roadIntersections.set(intersection.toString(),s)
                        
                    }
                    else{
                        //Add both IDs to this point's Set of ways
                        intersectingRoadsSet.add(key1)
                        intersectingRoadsSet.add(key2)
                    }
                }
                if(isFootpath){
                    const intersectingFootpathsSet = footpathIntersections.get(intersection.toString())
                    if(!intersectingFootpathsSet){
                        //If this point is new, make a new Set of ways for it
                        const s = new Set([key1,key2])
                        footpathIntersections.set(intersection.toString(),s)
                    }
                    else{
                        //Add both IDs to this point's Set of ways
                        intersectingFootpathsSet.add(key1)
                        intersectingFootpathsSet.add(key2)
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