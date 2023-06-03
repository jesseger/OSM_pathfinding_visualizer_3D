<template>
    <div>
        <button id="main" v-on="$listeners" :disabled="isDisabled"> {{ buttonText }}</button>
        <component v-if="isOpen" v-for="buttonItem in secondaryButtonList" v-bind:keys="buttonItem.id">
            <button @click="handleButton(buttonItem.id)">{{buttonItem.text}}</button>
        </component>
    </div>
</template>

<script>

export default {
    props: {
        isDisabled: Boolean,
        buttonText: {
            type: String,
            default: () => "Click me"
        },
        isOpen: Boolean,
        secondaryButtonList: Array,
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
#main {
    margin-top: 4rem;
    width: 4rem;
    height: 4rem;
    font-size: 0.5rem;
}

li button {
    width: 2rem;
    height: 2rem;
    font-size: 0.25rem;
}
</style>