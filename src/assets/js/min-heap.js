export class MinHeap {
    constructor(valueMap) {
        this.heap = [] //The items stored
        this.valueMap = valueMap //Maps each item to its value in the heap
    }

    // "Public" methods
    getSize(){
        return this.heap.length
    }
    contains(item){
        return this.heap.includes(item)
    }
    // Helper methods
    getLeftChildIndex(parentIndex) {
        return 2 * parentIndex + 1
    }
    getRightChildIndex(parentIndex) {
        return 2 * parentIndex + 2
    }
    getParentIndex(childIndex) {
        return Math.floor((childIndex - 1) / 2)
    }
    hasLeftChild(index) {
        return this.getLeftChildIndex(index) < this.heap.length
    }
    hasRightChild(index) {
        return this.getRightChildIndex(index) < this.heap.length
    }
    hasParent(index) {
        return this.getParentIndex(index) >= 0
    }
    leftChild(index) {
        return this.valueMap.get(this.heap[this.getLeftChildIndex(index)])
    }
    rightChild(index) {
        return this.valueMap.get(this.heap[this.getRightChildIndex(index)])
    }
    parent(index) {
        return this.valueMap.get(this.heap[this.getParentIndex(index)])
    }
    getValue(index) {
        return this.valueMap.get(this.heap[index])
    }
    // Operations
    swap(i,j){
        const temp = this.heap[i]
        this.heap[i] = this.heap[j]
        this.heap[j] = temp
    }
    bubbleUp(){
        let i = this.heap.length - 1
        while(this.hasParent(i) && this.parent(i) > this.getValue(i)){
            this.swap(this.getParentIndex(i), i)
            i = this.getParentIndex(i)
        }
    }
    heapifyDown(){
        let i = 0
        while(this.hasLeftChild(i)){
            let smallerChildIndex = this.getLeftChildIndex(i)
            smallerChildIndex = this.rightChild(i) < this.leftChild(i)? this.getRightChildIndex(i) : smallerChildIndex
            if(this.getValue(i) < this.getValue(smallerChildIndex)){
                break
            }
            this.swap(smallerChildIndex, i)
            i = smallerChildIndex
        }
    }
    insert(item){
        this.heap.push(item)
        this.bubbleUp()
    }
    remove(){
        if(this.heap.length === 0){
            return null
        }

        const item = this.heap[0]
        this.heap[0] = this.heap[this.heap.length - 1]
        this.heap.pop()
        this.heapifyDown()

        return item 
    }
}