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
        <space :isPedestrian="this.isWalkingSelected" :intersections="this.intersections" @sendHighwayData="handleHighwayData" />
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
            isRoadButtonOpen: false,
            isAlgoButtonOpen: false,
            roadButtons: roadButtons,
            algoButtons: algoButtons,
            isWalkingSelected: false,
            algorithm: null,
            highwayData: null,
            intersections: null,
            roadData: null,
            footpathData: null,
            roadIntersections: new Map(),
            footpathIntersections: new Map(),
        }
    },
    computed: {
        isRunDisabled(){
            return this.intersections == null
        }
    },
    methods: {
        handleRoadButtonClicked(){
            this.isRoadButtonOpen = !this.isRoadButtonOpen
            console.log(`Road clicked, now open: ${this.isRoadButtonOpen}`)
        },
        handleAlgoButtonClicked(){
            this.isAlgoButtonOpen = !this.isAlgoButtonOpen
            console.log(`Algo clicked, now open: ${this.isAlgoButtonOpen}`)
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
        handleHighwayData(data){
            this.highwayData = data

            if(window.Worker){
                const intersectionWorker = new Worker('src/assets/js/worker.js')
                intersectionWorker.postMessage(data)

                intersectionWorker.onmessage = (e) => {
                    this.roadIntersections = e.data.roadIntersections? e.data.roadIntersections : null
                    this.footpathIntersections = e.data.footpathIntersections? e.data.footpathIntersections : null

                    this.intersections = this.isWalkingSelected? this.roadIntersections : this.footpathIntersections
                }
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