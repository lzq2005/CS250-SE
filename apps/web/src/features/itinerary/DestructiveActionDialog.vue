<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const cancelButton = ref<HTMLButtonElement | null>(null);

function cancel(): void {
  if (!props.busy) emit('cancel');
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    cancelButton.value?.focus();
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="dialog-backdrop"
      @click.self="cancel"
      @keydown.esc="cancel"
    >
      <section
        class="dialog-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'destructive-dialog-title'"
      >
        <p class="dialog-kicker">CONFIRM ACTION</p>
        <h2 id="destructive-dialog-title">{{ title }}</h2>
        <p class="dialog-description">{{ description }}</p>
        <p v-if="errorMessage" class="dialog-error" role="alert">{{ errorMessage }}</p>
        <div class="dialog-actions">
          <button
            ref="cancelButton"
            type="button"
            class="dialog-cancel"
            :disabled="busy"
            @click="cancel"
          >
            {{ cancelLabel ?? '取消' }}
          </button>
          <button
            type="button"
            class="dialog-confirm"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ busy ? '处理中…' : confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(10 32 29 / 58%);
  padding: 20px;
}

.dialog-card {
  width: min(460px, 100%);
  border: 1px solid #d8e4df;
  border-radius: 18px;
  background: #fff;
  color: #15332f;
  box-shadow: 0 24px 70px rgb(5 28 24 / 28%);
  padding: 24px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}

.dialog-kicker {
  margin: 0 0 7px;
  color: #9c3b23;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.dialog-card h2 {
  margin: 0 0 10px;
  font-size: 22px;
  line-height: 1.25;
}

.dialog-description {
  margin: 0;
  color: #5d706d;
  font-size: 13px;
  line-height: 1.65;
}

.dialog-error {
  margin: 13px 0 0;
  border-radius: 9px;
  background: #fbe9e7;
  color: #8f2d20;
  padding: 9px 11px;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 20px;
}

.dialog-actions button {
  border: 0;
  border-radius: 9px;
  padding: 10px 15px;
  font: 700 12px "Segoe UI", "Microsoft YaHei", sans-serif;
  cursor: pointer;
}

.dialog-actions button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.dialog-cancel {
  background: #e5ece9;
  color: #15332f;
}

.dialog-confirm {
  background: #9b2f28;
  color: #fff;
}

@media (max-width: 480px) {
  .dialog-backdrop {
    align-items: end;
    padding: 12px;
  }

  .dialog-card {
    border-radius: 16px;
    padding: 20px;
  }

  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
