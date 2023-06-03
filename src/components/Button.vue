<template>
    <div id="wrapper">
        <v-btn id="main" :class="disabledClass" v-on="$listeners" :disabled="isDisabled" :icon="icon" rounded="lg" :variant="buttonVariant" color="primary"></v-btn>
        <div class="float">
        <component v-if="isOpen" v-for="buttonItem in secondaryButtonList" v-bind:keys="buttonItem.id">
            <div>
            <v-btn id="sub" @click="handleButton(buttonItem.id)" color="secondary" variant="tonal">{{buttonItem.text}}</v-btn>
            </div>
        </component>
        </div>
    </div>
</template>

<script>

export default {
    props: {
        isDisabled: Boolean,
        buttonText: String,
        icon: {
            type: String,
            default: () => "mdi-google-downasaur"
        },
        isOpen: Boolean,
        secondaryButtonList: Array,
        isPrimary: {
            type: Boolean,
            default: () => false
        }
    },
    computed: {
        buttonVariant(){
            return this.isPrimary? "elevated" : "outlined"
        },
        disabledClass(){
            //v-btn can still fire when disabled (prop is purely visual) -> explicitly disallow pointer events
            return this.isDisabled? "cancer" :""
        }
    },
    methods: {
        handleButton(text) {
            this.$emit(text)
            console.log(`Button ${text} pressed`)
        }
    }
}

</script>

<style scoped>
#wrapper {
    display: flex;
}

#main {
    width: 4rem;
    height: 4rem;
    font-size: 1.0rem;
}

#sub {
    margin-left: 40px;
    min-width: 6rem;
    margin-bottom: 1rem;
    font-size: 0.7rem;
}
.float {
    flex:1;
}

</style>