<template>
    <div id="full">
        <div id="gui">
            <div id="road">
                <app-button :icon="roadButtonIcon" :isOpen="isRoadButtonOpen" :secondaryButtonList="roadButtons" @click="handleRoadButtonClicked"
            @walking="handleWalkingClick" @driving="handleDrivingClick" />
            </div>

            <div id="building">
                <app-button :icon="buildingButtonIcon" @click="handleBuildingButtonClicked"></app-button>
            </div>

            <div id="algo">
                <app-button icon="mdi-magnify" :isOpen="isAlgoButtonOpen" :secondaryButtonList="algoButtons" @click="handleAlgoButtonClicked"
            @a-star="handleAStarClick" @dijkstra="handleDijkstraClick" @bfs="handleBFSClick" @dfs="handleDFSClick"/>
            </div>

            <v-tooltip :disabled="!isRunDisabled">
                <template v-slot:activator="{ props }">
                    <div id="go" v-bind="props">
                        <app-button :icon="goButtonIcon" :isOpen="false" :isDisabled="isRunDisabled" @click="handleComputeClick" isPrimary="true"/> 
                    </div>
                </template>
                <span v-if="!selectedStart"> Select a start node with ALT + click <br/></span>
                <span v-if="!selectedGoal"> Select an end node with ALT + click <br/></span>
                <span v-if="!roadEdges"> Edges are still loading</span>
            </v-tooltip>
        </div>
        <space :isPedestrian="isWalkingSelected" :isBuildingsVisible="isBuildingsVisible" :intersections="intersections" :edges="edges" @sendHighwayData="handleHighwayData" 
        :centerCoords="centerCoords" :isWeightedAlgo="isWeightedAlgo" :animationData="animationData" :shortestPath="shortestPath" @sendSelectedNodes="handleSelectedNodes"
        :toggleResetScene="toggleResetScene"/> 
    </div>
</template>

<script>

import Space from './Space.vue'
import AppButton from './Button.vue'
import { astar } from '../assets/js/astar.js'
import { bfs } from '../assets/js/bfs'

const timer = ms => new Promise(res => setTimeout(res, ms))

export default {
    name: 'pathfinder',
    components: {
        Space,
        AppButton,
    },
    data(){
        let roadButtons = []
        roadButtons.push({id:'walking', text: "Walking", icon: "mdi-walk"})
        roadButtons.push({id:'driving', text: "Driving", icon: "mdi-car"})

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
            animationSpeed: 0,
            shortestPath: null,
            selectedStart: null,
            selectedGoal: null,
            isRunning: false,
            toggleResetScene: false,
            isBuildingsVisible: true,
        }
    },
    computed: {
        isRunDisabled(){
            return !this.roadEdges || !this.footpathEdges || !this.selectedStart || !this.selectedGoal 
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
        isWeightedAlgo(){
            return this.algorithm === 0 || this.algorithm === 1
        },
        goButtonIcon(){
            return this.isRunning? "mdi-stop" : "mdi-play"
        },
        roadButtonIcon(){
            return this.isWalkingSelected? "mdi-walk" : "mdi-car"
        },
        buildingButtonIcon(){
            return this.isBuildingsVisible? "mdi-office-building-remove" : "mdi-office-building-plus"
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
            this.isRunning = false
        },
        handleDrivingClick(){
            this.isWalkingSelected = false
            this.isRunning = false
        },
        handleBuildingButtonClicked(){
            this.isBuildingsVisible = !this.isBuildingsVisible
        },
        handleAStarClick(){
            this.algorithm = 0
        },
        handleDijkstraClick(){
            this.algorithm = 1
        },
        handleBFSClick(){
            this.algorithm = 2
        },
        handleDFSClick(){
            this.algorithm = 3
        },
        async handleComputeClick(){
            if(this.isRunDisabled) return
        
            this.isRunning = !this.isRunning
            if(!this.isRunning){
                return
            }

            this.resetEdges()

            let gen
            switch (this.algorithm) {
                case 0:
                    gen = astar(this.edges, this.selectedStart, this.selectedGoal)
                    break
                case 1:
                    gen = astar(this.edges, this.selectedStart, this.selectedGoal, function(x,y){
                        return 0
                    })
                    break
                case 2:
                    gen = bfs(this.edges, this.selectedStart, this.selectedGoal)
                    break
                case 3:
                    gen = astar(this.edges, this.selectedStart, this.selectedGoal)
                    break
                default:
                    gen = astar(this.edges, this.selectedStart, this.selectedGoal)
            }

            const start = Date.now()

            for (let data of gen){
                if(!this.isRunning) break

                if(Array.isArray(data)){
                    this.animationData = data  
                } else{
                    this.shortestPath = data.success? data.path : []
                }        
                await timer(this.animationSpeed)
            }

            console.log(`Compute took ${Date.now() - start} ms`)
            this.isRunning = false
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
        handleSelectedNodes(data){
            this.selectedStart = data.start
            this.selectedGoal = data.goal
        },
        resetEdges(){
            this.toggleResetScene = !this.toggleResetScene
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
    z-index: 1;
    margin-left: 50px;
}

#road {
    position: absolute;
    margin-top: 4rem;
}

#building {
    position: absolute;
    margin-top: 14rem;
}

#algo {
    position: absolute;
    margin-top: 24rem;
}

#go {
    position: absolute;
    margin-top: 34rem;
} 

</style>