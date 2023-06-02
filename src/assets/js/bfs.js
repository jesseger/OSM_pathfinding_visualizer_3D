import { MinHeap } from "./min-heap"

export function* bfs(E, start, goal){

    const pathLength = new Map()
    const prev = new Map()

    var queuedHeap = new MinHeap(pathLength) //This heap stores node identifiers "x,y" which are sorted according to finding order

    pathLength.set(start, 0)
    queuedHeap.insert(start)

    const explored = new Set()
    explored.add(start)

    while(queuedHeap.getSize() > 0){

        const currentNode = queuedHeap.remove()
        yield [currentNode, null, prev.get(currentNode), pathLength.get(currentNode)] 

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

            if(!explored.has(neighbor)){
                queuedHeap.insert(neighbor)
                pathLength.set(neighbor, pathLength.get(currentNode) + 1)
                explored.add(neighbor)
                prev.set(neighbor, currentNode)

                yield [currentNode, neighbor, prev.get(currentNode), pathLength.get(currentNode)]
            }
        }
    }
}