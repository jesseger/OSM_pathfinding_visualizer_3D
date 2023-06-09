<template>
    <div id="window">
        <v-tabs 
        bg-color= 'primary' 
        center-active
        fixed-tabs
        v-model="tab">
            <v-tab value="use">How to use</v-tab>
            <v-tab value="about">About this project</v-tab>
            <v-tab value="path">Pathfinding</v-tab>

        </v-tabs>

        <v-window v-model="tab">
        <v-window-item value="use">
          <v-card color=transparent class="text-black">
            <v-card-title class="justify-center"> How to use this project </v-card-title>
            <v-card-subtitle class="justify-center"> Controls and buttons</v-card-subtitle>
            <v-card-text class="text-center">

                
                <div class="centered">
                    <app-button icon="mdi-car" />
                </div>

                <p>
                    Choose between ways accessible by car or by foot.
                </p>
                <br/>
                
                <div class="centered">
                    <app-button icon="mdi-magnify"/>
                </div>
                <p>
                    Select a pathfinding algorithm to visualize. Default is A*.
                </p>
                <br/>

                <div class="centered">
                    <app-button icon="mdi-office-building-remove"/>
                </div>
                <p>
                    Hide/show building geometry.
                </p>
                <br/>

                <div class="centered">
                    <v-img 
                    class="mx-auto"
                    :width="250"
                    aspect-ratio="16/9"
                    cover
                    src='./assets/tutorial.gif'
                    ></v-img>
                </div>
                <p>
                    Once the data has been loaded, you can select/deselect two points by hovering over an intersection and pressing <b>S</b> (start) or <b>G</b> (goal).
                </p>
                <br/>

                <div class="centered">
                    <app-button icon="mdi-play"/>
                </div>
                <p>
                    Run the visualization. 
                </p>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="about">
            <v-card color=transparent class="text-black">
                <v-card-title class="justify-center"> About this project </v-card-title>
                <v-card-text >
                    <p>
                        Since routing is a common problem in real-world applications (e.g. Uber, Google Maps), I thought it would be interesting to visualize common pathfinding algorithms 
                        on geographical data, rather than on synthetic graphs. 
                    </p>
                    <br>
                    <p>
                        This map is generated from GeoJson data of the city centre of Aachen, Germany. This data is queried from OpenStreetMap using the Overpass API. 
                        Therefore, it should be easy to manually insert or even dynamically fetch data of any other location.
                    </p>
                    <br />
                    <p id="git">
                        <b> The code is available on <a href="https://github.com/jesseger/pathfinding_3D">GitHub</a></b>
                    </p>

                    <b>Challenges: </b>
                    <p>
                        OSM streets/paths etc. are called "highways" and are made up of segments of latitude/longitude coordinates. Since this gives us no direct topological information,
                        we first have to calculate intersection points (≙"nodes") between each pair of highways . In this small map alone, walkable highways lead to ~13.000.000 computations.
                    </p>

                    <br>
                    <p>
                        Once we have nodes, it is still not trivial how to connect them, since more than two nodes can lie on a single highway. <br>
                        <i>Heuristic:</i> We first determine one of the "endpoints" P<sub>1</sub> by computing distances between each pair of nodes on the line;
                        unless the line is strongly curved, the two nodes P<sub>1</sub>, P<sub>n</sub> will have the longest distance to each other.
                        Then connect the remaining nodes based on their ascending distance from P<sub>1</sub>.
                    </p>
                    <br>

                    <p>
                        I tried my best to make the animation performant. Despite use of advantageous data structures, the main problem remains rendering. <br>
                        Computing the path usually takes &lt; 20 ms, but re-rendering lines with different materials easily leads to runtime of several minutes.
                        This could also be a result of how props are updated in Vue.
                    </p>
                    <br>

                    <b>Future Work:</b>
                    <p>
                        For faster visualization, one could aggregate several "animation steps" and then apply them bundled together.<br> 
                        This would mean fewer state changes and thus likely reduce the total delay. It would also reduce the animation of <i>frontier</i> edges, turning them directly into 
                        <i>visited</i> edges instead.
                    </p>
                    <br>
                    <p>
                        Maybe there is also an even faster way of computing intersections between line segments.
                    </p>
                    

                </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="path">
          <v-card color=transparent class="text-black">
            <v-card-title class="justify-center"> Pathfinding  </v-card-title>
            <v-card-subtitle class="justify-center"> Algorithms </v-card-subtitle>
            <v-card-text class="text-center">
                <p class="left"> The problem is simple: find the shortest path from start to goal. However, not all algorithms are made equal.</p>
                <br>
                <b>A*</b>
                <p>
                    <b>weighted: </b> it considers the length of every edge<br>
                    <b>informed: </b> it knows the location of the goal node<br>
                    <b>optimal, complete: </b> it is guaranteed to find the shortest path<br>
                </p>
                <br>

                <b>Dijkstra</b>
                <p>
                    <b>weighted: </b> it considers the length of every edge<br>
                    <b>uninformed: </b> it does not know the location of the goal node<br>
                    <b>optimal, complete: </b> it is guaranteed to find the shortest path<br>
                </p>
                <br>

                <b>Greedy Best-First-Search</b>
                <p>
                    <b>weighted: </b> it considers the length of every edge<br>
                    <b>informed: </b> it knows the location of the goal node<br>
                    <b>not optimal, complete: </b> the path found is not guaranteed to be the shortest<br>
                </p>
                <br>

                <b>Breadth-First-Search</b>
                <p>
                    <b>unweighted: </b> it considers only the number of edges<br>
                    <b>uninformed: </b> it does not know the location of the goal node<br>
                    <b>optimal, complete: </b> it is guaranteed to find the shortest path<br>
                </p>
                <br>
                <p class="left">
                    <b>For the sake of completeness,</b> we assume that the same node cannot be visited twice. For A* (and thus Dijkstra) this is naturally the case; 
                    if we find a new path to a visited node, the new f-value will always be equal at best (<i>given a consistent heuristic</i>). Otherwise, we would have taken this path to begin with.
                    <br>
                    For BFS and Greedy Best-First, we have to explicitly prevent adding visited nodes to the open list.
                </p>

            </v-card-text>
          </v-card>
        </v-window-item>
        </v-window>
    </div>
</template>
<script>

import { useTheme } from 'vuetify';
import AppButton from './Button.vue'

export default {
    name: 'help',
    components: {
        AppButton,
    },
    data(){

        return {
            theme: useTheme(),
            tab: 'use',
        }
    }

}
</script>

<style scoped>
#window {
    position: absolute;
    z-index: 3;
    width: 50%;
    min-width: 750px;
    height: 80%;
    min-height: 750px;
    margin-left: 25%;
    margin-top: 5%;
    background-color: #ffffffe3;
    
    border-radius: 10px;
}

.centered #wrapper {
    display: block;
}

.parent{
    text-align: center;
}
#window :deep() .justify-center {
    display: flex;
}

#git {
    text-align: center;
}

.left {
    text-align: left;
}
</style>