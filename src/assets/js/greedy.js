import { MinHeap } from './min-heap'

export function* greedy(V, E, start, goal, heuristic=directDistance){

    const f = new Map()
    const prev = new Map()

    var openHeap = new MinHeap(f) //MinHeap stores only node identifiers "x,y" which are sorted according to f

    f.set(start, heuristic(start, goal, V))
    openHeap.insert(start)

    while(openHeap.getSize() > 0){

        const currentNode = openHeap.remove()
        yield [currentNode, null, prev.get(currentNode), f.get(currentNode)]

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

            if(!f.has(neighbor) ){
                prev.set(neighbor, currentNode)
                const newF = heuristic(neighbor, goal, V)
                f.set(neighbor, newF)

                openHeap.insert(neighbor) 

                yield [currentNode, neighbor, prev.get(currentNode), f.get(currentNode)]
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
