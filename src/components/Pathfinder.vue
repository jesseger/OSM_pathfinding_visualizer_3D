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
        <space :isPedestrian="isWalkingSelected" :intersections="intersections" :edges="edges" @sendHighwayData="handleHighwayData" 
        :centerCoords="centerCoords" :animationData="animationData" :shortestPath="shortestPath" />
    </div>
</template>

<script>

import Space from './Space.vue'
import AppButton from './Button.vue'
import { astar } from '../assets/js/astar.js'

const timer = ms => new Promise(res => setTimeout(res, ms))

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
            animationData: null,
            animationSpeed: 10,
            shortestPath: null,
        }
    },
    computed: {
        isRunDisabled(){
            return !this.roadEdges || !this.footpathEdges
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
        async handleComputeClick(){
        
            console.log("GO has been clicked")

            const gen = astar(this.edges, "2.8046298858150776,-2.5492371645037935", "1.3794470347108203,9.736035392609828")

            const start = Date.now()

            for (let data of gen){
                if(Array.isArray(data)){
                    this.animationData = data  
                } else{
                    this.shortestPath = data.success? data.path : []
                }        
                await timer(this.animationSpeed)
            }

            console.log(`Compute took ${Date.now() - start} ms`)
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