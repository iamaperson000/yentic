import type { ViewerRole } from '@/types/collaboration';

type PersistCollaborativeStateOptions = {
  projectId: string | null;
  viewerRole: ViewerRole;
  isDirty: boolean;
  isSaving: boolean;
};

type ApplyRemoteCollaborativeStateOptions = {
  incomingState: string | null;
  localState: string | null;
  hasPendingLocalChanges?: boolean;
};

type ReplaceStandaloneEditorValueOptions = {
  modelValue: string;
  nextValue: string;
  collaborative: boolean;
};

type SavedStatusLabelOptions = {
  isLoadingCloudProject: boolean;
  cloudAuthRequired: boolean;
  cloudError: string | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  hydrated: boolean;
  formattedTime: string | null;
};

export function shouldPersistCollaborativeState({
  projectId,
  viewerRole,
  isDirty,
  isSaving,
}: PersistCollaborativeStateOptions): boolean {
  return Boolean(projectId) && viewerRole !== 'viewer' && isDirty && !isSaving;
}

export function shouldApplyRemoteCollaborativeState({
  incomingState,
  localState,
  hasPendingLocalChanges = false,
}: ApplyRemoteCollaborativeStateOptions): boolean {
  if (!incomingState || hasPendingLocalChanges) {
    return false;
  }

  return incomingState !== localState;
}

export function shouldReplaceStandaloneEditorValue({
  modelValue,
  nextValue,
  collaborative,
}: ReplaceStandaloneEditorValueOptions): boolean {
  if (collaborative) {
    return false;
  }

  return modelValue !== nextValue;
}

export function getSavedStatusLabel({
  isLoadingCloudProject,
  cloudAuthRequired,
  cloudError,
  isSaving,
  lastSavedAt,
  hydrated,
  formattedTime,
}: SavedStatusLabelOptions): string {
  if (isLoadingCloudProject) {
    return 'Loading project…';
  }
  if (cloudAuthRequired) {
    return 'Not syncing (sign in)';
  }
  if (cloudError) {
    return 'Sync issue';
  }
  if (isSaving) {
    return 'Saving…';
  }
  if (hydrated && formattedTime) {
    return `Saved at ${formattedTime}`;
  }
  if (lastSavedAt) {
    return 'Synced to cloud';
  }
  return 'Local backup only';
}
