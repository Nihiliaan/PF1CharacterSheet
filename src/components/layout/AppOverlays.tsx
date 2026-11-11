import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import ForumSyncModal from '../editor/ForumSyncModal';
import CardExportModal from '../export/CardExportModal';
import { useTranslation } from 'react-i18next';
import Dialog from '../common/Dialog';
import AIExtractionModal from '../editor/AIExtractionModal';

import { useUI } from '../../contexts/UIContext';
import { useCharacter } from '../../contexts/CharacterContext';
import { useCharacterAI } from '../../contexts/hooks/useCharacterAI';

export default function AppOverlays() {
  const { t } = useTranslation();
  const {
    confirmModal,
    setConfirmModal,
    forumSyncOpen, setForumSyncOpen,
    cardExportOpen, setCardExportOpen,
  } = useUI();

  const {
    isSyncing,
    setData,
    setCurrentCharacterId,
    handleAIExtract,
    showAIModal,
    setShowAIModal,
    isAILoading,
    userApiKey,
    setUserApiKey,
    showApiKeyInput,
    setShowApiKeyInput,
    aiModel,
    setAiModel,
    availableModels,
    isFetchingModels,
    fetchAvailableModels,
    aiInputText,
    setAiInputText,
    aiStatusMsg
  } = useCharacter();

  return (
    <>
      {/* 全局通知（sonner 渲染，UIContext.setToast 触发） */}
      <Toaster position="top-center" richColors />

      {/* 论坛同步 / 角色卡图片导出（触发点：文档标签右键菜单） */}
      <ForumSyncModal isOpen={forumSyncOpen} onClose={() => setForumSyncOpen(false)} />
      <CardExportModal isOpen={cardExportOpen} onClose={() => setCardExportOpen(false)} />

      {/* 确认弹窗 */}
      <AnimatePresence>
        {confirmModal && (
          <Dialog
            type="confirm" title={confirmModal.title} onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }} onCancel={() => { confirmModal.onCancel?.(); setConfirmModal(null); }}
            onSecondaryConfirm={confirmModal.onSecondaryConfirm ? () => { confirmModal.onSecondaryConfirm!(); setConfirmModal(null); } : undefined}
            secondaryLabel={t('overlays.save_and_continue')}
          />
        )}
      </AnimatePresence>

      {/* AI Extraction Modal */}
      <AnimatePresence>
        {showAIModal && (
          <AIExtractionModal
            showAIModal={showAIModal} 
            setShowAIModal={setShowAIModal}
            aiInputText={aiInputText} 
            setAiInputText={setAiInputText} 
            isAILoading={isAILoading}
            userApiKey={userApiKey} 
            setUserApiKey={setUserApiKey} 
            showApiKeyInput={showApiKeyInput}
            setShowApiKeyInput={setShowApiKeyInput} 
            handleAIExtract={handleAIExtract}
            aiStatusMsg={aiStatusMsg}
            aiModel={aiModel}
            setAiModel={setAiModel}
            availableModels={availableModels}
            isFetchingModels={isFetchingModels}
            fetchAvailableModels={fetchAvailableModels}
          />
        )}
      </AnimatePresence>
    </>
  );
}
