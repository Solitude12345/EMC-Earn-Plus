<template>
  <el-input
    v-bind="$attrs"
    :model-value="modelValue"
    @update:model-value="updateValue"
    class="emc-input rounded-[10px]"
    :class="{ 'emc-input-not-bg': notBg }"
    :style="customStyle"
  >
    <template
      v-if="$slots.prefix"
      #prefix
    >
      <slot name="prefix"></slot>
    </template>
    <template
      v-if="$slots.suffix"
      #suffix
    >
      <slot name="suffix"></slot>
    </template>
    <template
      v-if="$slots.prepend"
      #prepend
    >
      <slot name="prepend"></slot>
    </template>
    <template
      v-if="$slots.append"
      #append
    >
      <slot name="append"></slot>
    </template>
  </el-input>
</template>

<script setup>
import { toRefs } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  notBg: {
    type: Boolean,
    default: false,
  },
  customStyle: {
    type: [String, Object],
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const { modelValue, customStyle, notBg } = toRefs(props);

const updateValue = (value) => {
  emit('update:modelValue', value);
};

</script>

<style
  lang="scss"
  scoped
>
@import "@/style/variables.scss";

.el-input.is-disabled .el-input__inner {
  color: unset;
  -webkit-text-fill-color: unset;
  cursor: not-allowed;
}

.emc-input {
  --el-text-color-placeholder: rgba(255, 255, 255, 0.3);

  :deep(.el-input__wrapper) {
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 16px;
    height: 50px;
    background-image: url('@/assets/images/emc/input-bg.png');
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-color: #0C0C0D;
    --el-input-border-color: transparent;
    --el-input-hover-border-color: $--emc-color-primary;
    --el-disabled-border-color: transparent;
  }

  :deep(.el-input__inner) {
    height: 100%;
    color: rgba(255, 255, 255, 0.8);
  }

  :deep(textarea) {
    max-height: 120px;
    font-size: 16px;
    height: 100%;
    border-radius: 10px;
    padding: 12px 16px;
    color: rgba(255, 255, 255, 0.8);
    background-image: url('@/assets/images/emc/input-textarea-bg.png');
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-color: #0C0C0D;

    --el-input-border-color: transparent;
    --el-input-hover-border-color: $--emc-color-primary;
  }

  :deep(.el-textarea__inner) {
    resize: none;
  }
}

.emc-input-not-bg {
  :deep(.el-input__wrapper) {
    background-image: unset;
    background-color: #0C0C0D;
  }
}
</style>
