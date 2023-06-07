<template>
    <div id="full">
        <div id="gui">
            <div id="road">
                <app-button :icon="roadButtonIcon" :isOpen="isRoadButtonOpen" :secondaryButtonList="roadButtons" @click="handleRoadButtonClick"
            @walking="handleWalkingClick" @driving="handleDrivingClick" />
            </div>

            <div id="building">
                <app-button :icon="buildingButtonIcon" @click="handleBuildingButtonClick"></app-button>
            </div>

            <div id="algo">
                <app-button icon="mdi-magnify" :isOpen="isAlgoButtonOpen" :secondaryButtonList="algoButtons" @click="handleAlgoButtonClick"
            @a-star="handleAStarClick" @dijkstra="handleDijkstraClick" @bfs="handleBFSClick" @dfs="handleDFSClick"/>
            </div>

            <v-tooltip :disabled="!isRunDisabled">
                <template v-slot:activator="{ props }">
                    <div id="go" v-bind="props">
                        <app-button :icon="goButtonIcon" :isOpen="false" :isDisabled="isRunDisabled" @click="handleComputeClick" isPrimary="true"/> 
                    </div>
                </template>
                <span v-if="!selectedStart"> Select a start node with S <br/></span>
                <span v-if="!selectedGoal"> Select a goal node with G <br/></span>
                <span v-if="!roadEdges"> Edges are still loading</span>
            </v-tooltip>

        <div id="select">
            <v-select
            v-model="animationLabel"
            :items="['None','Normal','Slow']"
            label="Animation"
            density="compact"
            ></v-select>
        </div>

        <div id="help">
            <app-button icon="mdi-help" @click="handleHelpButtonClick"></app-button>
        </div>
        </div>

        <div id="helpWindow" v-if="isHelpButtonOpen">
            <help-page />
        </div>

        <space :isPedestrian="isWalkingSelected" :isBuildingsVisible="isBuildingsVisible" :footpathIntersections="footpathIntersections" :roadIntersections="roadIntersections" 
        :footpathEdges="footpathEdges" :roadEdges="roadEdges" :isDataReady="isDataReady" @sendHighwayData="handleHighwayData" :centerCoords="centerCoords" 
        :isWeightedAlgo="isWeightedAlgo" :animationData="animationData" :shortestPath="shortestPath" @sendSelectedNodes="handleSelectedNodes" :toggleResetScene="toggleResetScene" 
        :isRunning="isRunning"/> 
    </div>
</template>

<script>

import Space from './Space.vue'
import AppButton from './Button.vue'
import HelpPage from './HelpPage.vue'
import { astar } from '../assets/js/astar.js'
import { bfs } from '../assets/js/bfs'

const timer = ms => new Promise(res => setTimeout(res, ms))

export default {
    name: 'pathfinder',
    components: {
        Space,
        AppButton,
        HelpPage
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
            animationLabel: 'Normal',
            shortestPath: null,
            selectedStart: null,
            selectedGoal: null,
            isRunning: false,
            toggleResetScene: false,
            isBuildingsVisible: true,
            isHelpButtonOpen: false,
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
        isDataReady(){
            return this.footpathEdges !== null && this.footpathIntersections !== null
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
        helpButtonIcon(){
            return "mdi-help"
        },
        animationSpeed(){
            console.log("Anilabel now: ", this.animationLabel)
            switch(this.animationLabel){
                case 'None':
                    return null
                case 'Normal':
                    return 10
                case 'Slow': 
                    return 1000
                default:
                    return 10
            }
        }
    },
    methods: {
        handleRoadButtonClick(){
            this.isRoadButtonOpen = !this.isRoadButtonOpen
        },
        handleAlgoButtonClick(){
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
        handleBuildingButtonClick(){
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
        handleHelpButtonClick(){
            this.isHelpButtonOpen = !this.isHelpButtonOpen
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
                    gen = astar(this.intersections, this.edges, this.selectedStart, this.selectedGoal)
                    break
                case 1:
                    gen = astar(this.intersections, this.edges, this.selectedStart, this.selectedGoal, (x,y,V) => 0)
                    break
                case 2:
                    gen = bfs(this.edges, this.selectedStart, this.selectedGoal)
                    break
                case 3:
                    gen = astar(this.edges, this.selectedStart, this.selectedGoal)
                    break
                default:
                    gen = astar(this.intersections, this.edges, this.selectedStart, this.selectedGoal)
            }

            const start = Date.now()

            let i = 0
            for (let data of gen){
                i++
                if(!this.isRunning) break

                if(Array.isArray(data)){
                    this.animationData = data  
                } else{
                    this.shortestPath = data.success? data.path : []
                }        
                if(this.animationSpeed){
                    await timer(this.animationSpeed)
                }
            }

            console.log(`Compute took ${Date.now() - start} ms`)
            console.log(`and ${i} rendering passes`)
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

                    if(e.data.progress){
                        console.log(e.data.progress)
                    }
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
    margin-top: 4vh/*4rem*/;
}

#building {
    position: absolute;
    margin-top: 18vh /*14rem*/;
}

#algo {
    position: absolute;
    margin-top: 32vh/*24rem*/;
}

#go {
    position: absolute;
    margin-top: 46vh;
} 

#select {
    position: absolute;
    margin-top: 54vh;
    margin-left: -30px;
    width: 120px;
    color: #ff4d00;   
}

#help {
    position: absolute;
    margin-top: 90vh;
}
#select >>> .v-field__overlay{
    background-color: white;
    opacity: 0.5;
    outline: 2px solid #ff4d00;
}

</style>