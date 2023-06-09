import { coordStringToArray } from './utils'
import { MinHeap } from './min-heap'

export function* astar(V, E, start, goal, heuristic=directDistance){

    const g = new Map()
    const h = new Map()
    const f = new Map()
    const prev = new Map()

    var openHeap = new MinHeap(f) //MinHeap stores only node identifiers "x,y" which are sorted according to f

    g.set(start,0) 
    h.set(start,heuristic(start, goal, V))
    f.set(start, g.get(start) + h.get(start))
    openHeap.insert(start)

    while(openHeap.getSize() > 0){

        const currentNode = openHeap.remove()
        yield [currentNode, null, prev.get(currentNode), g.get(currentNode)]

        if(currentNode === goal){
            let curr = currentNode
            const path = []

            let previous
            while((previous = prev.get(curr))){
                path.push([previous, curr])
                curr = previous
            }
            yield {
                success: true,
                path: path,
            }
            return
        }

        for(let outgoingEdge of E.get(currentNode)){
            const neighbor = outgoingEdge.neighbor

            const newG = g.get(currentNode) + outgoingEdge.dist 

            if(!g.has(neighbor) || newG < g.get(neighbor)){
                prev.set(neighbor, currentNode)
                g.set(neighbor, newG)
                if(!h.has(neighbor)){
                    h.set(neighbor, heuristic(neighbor, goal, V))
                }
                f.set(neighbor, newG + h.get(neighbor))

                if(!openHeap.contains(neighbor)){
                    openHeap.insert(neighbor)
                }

                yield [currentNode, neighbor, prev.get(currentNode), g.get(currentNode)]
            }
        }
    }

    yield {
        success: false
    }

}

function directDistance(node1, node2, V){
    const [x1,y1] = V.get(node1).coords
    const [x2,y2] = V.get(node2).coords

    return Math.sqrt((x1-x2)**2 + (y1-y2)**2)
}
