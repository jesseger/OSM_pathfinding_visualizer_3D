var roadIntersections = new Map()
var footpathIntersections = new Map()

onmessage = (e) => {
    console.log("Worker started")

    computeLineIntersections(e.data)
    postMessage({
        roadIntersections: roadIntersections,
        footpathIntersections: footpathIntersections,
    })
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
                numIntersections = this.getLineIntersection(linePoints1, linePoints2, i_key, j_key, isRoad, isFootpath, numIntersections)
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
 * @param {string} key1 Key of first line, only needed to 
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

            const intersection = this.getLineSegmentIntersection(A_x,A_z,B_x,B_z,C_x,C_z,D_x,D_z)
            
            if(intersection){
                if(isRoad){
                    roadIntersections.set(numIntersections,{
                        coords: intersection,
                        way1: key1,
                        way2: key2
                    })
                }
                if(isFootpath){
                    footpathIntersections.set(numIntersections,{
                        coords:intersection,
                        way1: key1,
                        way2: key2
                    })
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