import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSavedStatusLabel,
  shouldApplyRemoteCollaborativeState,
  shouldPersistCollaborativeState,
  shouldReplaceStandaloneEditorValue,
} from '../src/lib/workspace-collaboration';

test('shouldPersistCollaborativeState only allows dirty editable cloud projects to flush', () => {
  assert.equal(
    shouldPersistCollaborativeState({
      projectId: 'project-1',
      viewerRole: 'owner',
      isDirty: true,
      isSaving: false,
    }),
    true,
  );

  assert.equal(
    shouldPersistCollaborativeState({
      projectId: 'project-1',
      viewerRole: 'viewer',
      isDirty: true,
      isSaving: false,
    }),
    false,
  );

  assert.equal(
    shouldPersistCollaborativeState({
      projectId: null,
      viewerRole: 'editor',
      isDirty: true,
      isSaving: false,
    }),
    false,
  );

  assert.equal(
    shouldPersistCollaborativeState({
      projectId: 'project-1',
      viewerRole: 'editor',
      isDirty: false,
      isSaving: false,
    }),
    false,
  );

  assert.equal(
    shouldPersistCollaborativeState({
      projectId: 'project-1',
      viewerRole: 'editor',
      isDirty: true,
      isSaving: true,
    }),
    false,
  );
});

test('shouldApplyRemoteCollaborativeState only adopts distinct remote snapshots', () => {
  assert.equal(
    shouldApplyRemoteCollaborativeState({
      incomingState: 'remote-state',
      localState: 'local-state',
    }),
    true,
  );

  assert.equal(
    shouldApplyRemoteCollaborativeState({
      incomingState: 'same-state',
      localState: 'same-state',
    }),
    false,
  );

  assert.equal(
    shouldApplyRemoteCollaborativeState({
      incomingState: null,
      localState: 'local-state',
    }),
    false,
  );

  assert.equal(
    shouldApplyRemoteCollaborativeState({
      incomingState: 'remote-state',
      localState: 'local-state',
      hasPendingLocalChanges: true,
    }),
    false,
  );
});

test('shouldReplaceStandaloneEditorValue skips redundant value writes and collaborative sessions', () => {
  assert.equal(
    shouldReplaceStandaloneEditorValue({
      modelValue: 'const value = 1;',
      nextValue: 'const value = 1;',
      collaborative: false,
    }),
    false,
  );

  assert.equal(
    shouldReplaceStandaloneEditorValue({
      modelValue: 'const value = 1;',
      nextValue: 'const value = 2;',
      collaborative: false,
    }),
    true,
  );

  assert.equal(
    shouldReplaceStandaloneEditorValue({
      modelValue: 'const value = 1;',
      nextValue: 'const value = 2;',
      collaborative: true,
    }),
    false,
  );
});

test('getSavedStatusLabel avoids locale-specific timestamps before hydration', () => {
  assert.equal(
    getSavedStatusLabel({
      isLoadingCloudProject: false,
      cloudAuthRequired: false,
      cloudError: null,
      isSaving: false,
      lastSavedAt: new Date('2026-04-11T18:45:00.000Z'),
      hydrated: false,
      formattedTime: '2:45 PM',
    }),
    'Synced to cloud',
  );

  assert.equal(
    getSavedStatusLabel({
      isLoadingCloudProject: false,
      cloudAuthRequired: false,
      cloudError: null,
      isSaving: false,
      lastSavedAt: new Date('2026-04-11T18:45:00.000Z'),
      hydrated: true,
      formattedTime: '2:45 PM',
    }),
    'Saved at 2:45 PM',
  );
});
