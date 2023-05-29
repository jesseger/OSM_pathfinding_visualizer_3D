<template>
    <div id="full">
        <div id="gui">
            <div>
            <app-button button-text="Road" :isOpen="isRoadButtonOpen" :secondaryButtonList="roadButtons" @click="handleRoadButtonClicked"
            @walking="handleWalkingClick" @driving="handleDrivingClick" />
            </div>
            <div>
            <app-button button-text="Algo" :isOpen="isAlgoButtonOpen" :secondaryButtonList="algoButtons" @click="handleAlgoButtonClicked"
            @a-star="handleAStarClick" @bfs="handleBFSClick" @dfs="handleDFSClick"/>
            </div>
            <div>
                <app-button button-text="GO" :isOpen="false" :isDisabled="isRunDisabled" @click="handleComputeClick"/>
            </div>
        </div>
        <space :isPedestrian="isWalkingSelected" :intersections="intersections" :edges="edges" @sendHighwayData="handleHighwayData" :centerCoords="centerCoords"/>
    </div>
</template>

<script>

import Space from './Space.vue'
import AppButton from './Button.vue'


export default {
    name: 'pathfinder',
    components: {
        Space,
        AppButton,
    },
    data(){
        let roadButtons = []
        roadButtons.push({id:'walking', text: "Walking"})
        roadButtons.push({id:'driving', text: "Driving"})

        let algoButtons = []
        algoButtons.push({id:'a-star', text: "A*"})
        algoButtons.push({id:'bfs', text: "BFS"})
        algoButtons.push({id:'dfs',text: "DFS"})
        algoButtons.push({id:'dijkstra',text: "Dijkstra"})
        
        return {
            centerCoords: [6.08379, 50.77539],
            isRoadButtonOpen: false,
            isAlgoButtonOpen: false,
            roadButtons: roadButtons,
            algoButtons: algoButtons,
            isWalkingSelected: false,
            algorithm: null,
            highwayData: null,
            roadIntersections: null,
            footpathIntersections: null,
            roadEdges: null,
            footpathEdges: null,
        }
    },
    computed: {
        isRunDisabled(){
            return this.intersections == null
        },
        intersections(){
            if(this.isWalkingSelected && this.footpathIntersections){
                return this.footpathIntersections
            }
            else if(!this.isWalkingSelected && this.roadIntersections){
                return this.roadIntersections
            }
            return null
        },
        edges(){
            if(this.isWalkingSelected && this.footpathEdges){
                return this.footpathEdges
            }
            else if(!this.isWalkingSelected && this.roadEdges){
                return this.roadEdges
            }
            return null
        },
    },
    methods: {
        handleRoadButtonClicked(){
            this.isRoadButtonOpen = !this.isRoadButtonOpen
        },
        handleAlgoButtonClicked(){
            this.isAlgoButtonOpen = !this.isAlgoButtonOpen
        },
        handleWalkingClick(){
            this.isWalkingSelected = true
            console.log("Walking selected")
        },
        handleDrivingClick(){
            this.isWalkingSelected = false
            console.log("Driving selected")
        },
        handleAStarClick(){
            console.log("A* selected")
        },
        handleBFSClick(){
            console.log("BFS selected")
        },
        handleDFSClick(){
            console.log("DFS selected")
        },
        handleDijkstraClick(){
            console.log("Dijkstra selected")
        },
        handleComputeClick(){
            console.log("GO has been clicked")
        },
        handleHighwayData(highwayData){
            this.highwayData = highwayData

            if(window.Worker){ 
                const graphWorker = new Worker('src/assets/js/worker.js', {type: "module"},)
                graphWorker.postMessage({
                    highwayData: highwayData,
                    centerCoords: this.centerCoords.toString()
                })

                graphWorker.onmessage = (e) => {
                    this.roadIntersections = e.data.roadIntersections? e.data.roadIntersections : null
                    this.footpathIntersections = e.data.footpathIntersections? e.data.footpathIntersections : null
                    this.roadEdges = e.data.roadEdges? e.data.roadEdges : null
                    this.footpathEdges = e.data.footpathEdges? e.data.footpathEdges : null
                }
            }
            else{
                //TODO popup window, buttons disabled
                console.log("Background processes (web workers) not supported in this browser.")
            }
        },  
    }
}
</script>

<style scoped>

#full {
    position: relative;
}

#gui {
    position: absolute;
    z-index: 999;
    margin-left: 50px;
}
</style>