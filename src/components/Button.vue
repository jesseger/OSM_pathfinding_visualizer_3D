<template>
    <div id="wrapper">
            <v-btn outlined id="main" v-on="$listeners" :disabled="isDisabled" :icon="icon" rounded="lg"  color="primary" :variant="buttonVariant"></v-btn>
        <div class="float">
        <component v-if="isOpen" v-for="buttonItem in secondaryButtonList" v-bind:keys="buttonItem.id">
            <div>
            <v-btn id="sub" @click="handleButton(buttonItem.id)" color="secondary" >{{buttonItem.text}}</v-btn>
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
    background: #00b3ffbb !important;
}

.float {
    flex:1;
}

.v-btn--variant-outlined{
    background: rgba(255, 255, 255, 0.5);
    color: #ff4d00;
    outline-width: 2px;
}
</style>