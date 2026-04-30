import React from 'react';
import { AnimatePresence } from 'motion/react';
import Dialog from '../common/Dialog';
import Toast from '../common/Toast';
import AIExtractionModal from '../character/AIExtractionModal';

import { useCharacter } from '../../contexts/CharacterContext';

export default function AppOverlays() {
  const { 
    handleAIExtract, 
    isSyncing, 
    confirmModal, 
    setConfirmModal,
    toast,
    setToast,
    showAIModal,
    setShowAIModal,
    isAILoading,
    userApiKey, 
    setUserApiKey, 
    showApiKeyInput, 
    setShowApiKeyInput,
    aiInputText, 
    setAiInputText
  } = useCharacter();

  return (
    <>
      {/* Syncing Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center text-white flex-col gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-serif italic font-medium">正在连接到异世界...</p>
        </div>
      )}

      {/* Dialogs and Toasts */}
      <AnimatePresence>
        {confirmModal && (
          <Dialog 
            type="confirm" title={confirmModal.title} onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }} onCancel={() => setConfirmModal(null)} 
            onSecondaryConfirm={confirmModal.onSecondaryConfirm ? () => { confirmModal.onSecondaryConfirm!(); setConfirmModal(null); } : undefined}
            secondaryLabel="立即保存并继续"
          />
        )}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
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
          />
        )}
      </AnimatePresence>
    </>
  );
}
