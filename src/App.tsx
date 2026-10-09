import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ChatProvider, useChat } from './context/ChatContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatHeader } from './components/ChatHeader.tsx';
import { MessageList } from './components/MessageList.tsx';
import { MessageInput } from './components/MessageInput.tsx';
import { ConversationInfoDrawer } from './components/ConversationInfoDrawer.tsx';
import { NewChatModal } from './components/Modals/NewChatModal.tsx';
import { ProfileSettingsModal } from './components/Modals/ProfileSettingsModal.tsx';
import { CodeSnippetModal } from './components/Modals/CodeSnippetModal.tsx';
import { E2EKeyModal } from './components/Modals/E2EKeyModal.tsx';
import { AiSummaryModal } from './components/Modals/AiSummaryModal.tsx';
import { ImageViewerModal } from './components/Modals/ImageViewerModal.tsx';
import { AuthModal } from './components/Modals/AuthModal.tsx';

function ChatApp() {
  const { user } = useAuth();
  const { activeConversation, activeConversationId, sendMessage } = useChat();

  // Drawer & modal states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isE2EModalOpen, setIsE2EModalOpen] = useState(false);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; name?: string } | null>(null);

  const handleSendCodeSnippet = async (code: string, language: string, note?: string) => {
    await sendMessage({
      text: note || `Shared a ${language} code snippet:`,
      mediaType: 'code',
      mediaUrl: code,
      codeLanguage: language,
    });
  };

  const handleOpenImage = (url: string, name?: string) => {
    setViewerImage({ url, name });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar: Permanent on md+, absolute off-canvas on mobile */}
      <div
        className={`fixed md:relative z-40 h-full transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenProfileModal={() => setIsProfileOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onCloseMobileDrawer={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Center Container */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-950 relative">
        <ChatHeader
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onToggleInfoDrawer={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
          onOpenAiSummary={() => setIsAiSummaryOpen(true)}
          onOpenE2EModal={() => setIsE2EModalOpen(true)}
        />

        <MessageList
          onOpenImage={handleOpenImage}
          onOpenE2EModal={() => setIsE2EModalOpen(true)}
        />

        {activeConversation && (
          <MessageInput
            onOpenCodeModal={() => setIsCodeModalOpen(true)}
            onOpenE2EModal={() => setIsE2EModalOpen(true)}
          />
        )}
      </main>

      {/* Right Conversation Info Drawer */}
      {isInfoDrawerOpen && (
        <ConversationInfoDrawer
          isOpen={isInfoDrawerOpen}
          onClose={() => setIsInfoDrawerOpen(false)}
          onOpenImage={handleOpenImage}
          onOpenE2EModal={() => setIsE2EModalOpen(true)}
        />
      )}

      {/* All Modal Dialogs */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />

      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <CodeSnippetModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onSendCode={handleSendCodeSnippet}
      />

      {activeConversationId && (
        <E2EKeyModal
          isOpen={isE2EModalOpen}
          onClose={() => setIsE2EModalOpen(false)}
          conversationId={activeConversationId}
        />
      )}

      {activeConversation && (
        <AiSummaryModal
          isOpen={isAiSummaryOpen}
          onClose={() => setIsAiSummaryOpen(false)}
          conversationId={activeConversation.id}
          conversationName={activeConversation.name}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ImageViewerModal
        isOpen={!!viewerImage}
        imageUrl={viewerImage?.url || ''}
        imageName={viewerImage?.name}
        onClose={() => setViewerImage(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <ChatApp />
      </ChatProvider>
    </AuthProvider>
  );
}
