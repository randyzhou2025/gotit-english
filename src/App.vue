<template>
  <view>
    <slot />
  </view>
</template>

<style lang="scss">
page {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  background: var(--page-bg);
  color: var(--ink);
  font-family: var(--font-sans);
}

body,
uni-page-body,
#app {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

view,
scroll-view,
text,
image,
input,
textarea,
button {
  box-sizing: border-box;
}
</style>
