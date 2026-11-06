<script setup lang="ts">
import { ref } from 'vue';
import type { CandidatePlan, SavedItinerary } from '@tripmate/contracts';
import DestructiveActionDialog from './DestructiveActionDialog.vue';
import type { ItineraryOverwriteAdapter } from './itineraryOverwriteAdapter';

const props = defineProps<{
  candidate: CandidatePlan;
  itineraryId: string;
  expectedVersion: number;
  adapter: ItineraryOverwriteAdapter;
}>();

const emit = defineEmits<{
  overwritten: [saved: SavedItinerary];
}>();

const dialogOpen = ref(false);
const busy = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

function requestOverwrite(): void {
  errorMessage.value = '';
  successMessage.value = '';
  dialogOpen.value = true;
}

function cancelOverwrite(): void {
  if (busy.value) return;
  dialogOpen.value = false;
  errorMessage.value = '';
}

async function confirmOverwrite(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = '';
  try {
    const saved = await props.adapter.overwrite({
      mode: 'overwrite',
      itineraryId: props.itineraryId,
      expectedVersion: props.expectedVersion,
      confirmed: true,
      candidate: props.candidate,
    });
    dialogOpen.value = false;
    successMessage.value = '保存行程已覆盖';
    emit('overwritten', saved);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '覆盖失败，请重试。';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="overwrite-action" aria-labelledby="overwrite-action-title">
    <div>
      <p class="eyebrow">SAVED PLAN</p>
      <h2 id="overwrite-action-title">已保存行程</h2>
      <p>保存版本 {{ expectedVersion }}。覆盖前会再次要求明确确认。</p>
    </div>
    <button type="button" class="overwrite-button" :disabled="busy" @click="requestOverwrite">
      覆盖已保存行程
    </button>

    <p v-if="successMessage" class="overwrite-success" role="status">{{ successMessage }}</p>

    <DestructiveActionDialog
      :open="dialogOpen"
      title="覆盖已保存行程？"
      :description="`会用当前候选替换版本 ${expectedVersion}。取消不会发送保存请求，也不会修改版本或时间。`"
      confirm-label="确认覆盖"
      cancel-label="取消覆盖"
      :busy="busy"
      :error-message="errorMessage"
      @cancel="cancelOverwrite"
      @confirm="confirmOverwrite"
    />
  </section>
</template>

<style scoped>
.overwrite-action {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  max-width: 1120px;
  margin: 0 auto 44px;
  border: 1px solid #e2c5c0;
  border-radius: 16px;
  background: #fffaf8;
  padding: 18px 20px;
  color: #15332f;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}

.eyebrow {
  margin: 0 0 4px;
  color: #9b2f28;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.overwrite-action h2 {
  margin: 0 0 4px;
  font-size: 17px;
}

.overwrite-action p {
  margin: 0;
  color: #5d706d;
  font-size: 11px;
}

.overwrite-button {
  flex: none;
  border: 1px solid #b75b50;
  border-radius: 9px;
  background: #fff;
  color: #8f2d20;
  padding: 9px 12px;
  font: 700 12px "Segoe UI", "Microsoft YaHei", sans-serif;
  cursor: pointer;
}

.overwrite-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.overwrite-success {
  color: #116b5c !important;
  font-weight: 700;
}

@media (max-width: 640px) {
  .overwrite-action {
    align-items: stretch;
    flex-direction: column;
    margin: 0 16px 32px;
  }
}
</style>
