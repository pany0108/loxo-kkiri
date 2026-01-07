import React, { useRef } from 'react';
import toast from 'react-hot-toast';
import { Link, Share2, X } from 'lucide-react';
import { motion, AnimatePresence, AnimatePresenceProps } from 'framer-motion';

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle: string;
  meetingUrl: string;
}

const ShareMeetingModal: React.FC<ShareMeetingModalProps> = ({ isOpen, onClose, meetingTitle, meetingUrl }) => {
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;
    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    if (distance > minSheetSwipeDistance) {
      onClose();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      toast.success('링크가 복사되었습니다!');
    } catch (err) {
      toast.error('링크 복사에 실패했습니다.');
      console.error('Failed to copy: ', err);
    }
    onClose();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `[${meetingTitle}] 약속에 초대합니다!`,
          text: `아래 링크를 눌러 가능한 시간을 알려주세요.`,
          url: meetingUrl,
        });
      } catch (error) {
        // 사용자가 공유를 취소한 경우는 에러로 취급하지 않음
        if ((error as DOMException).name !== 'AbortError') {
          console.error('Share failed:', error);
          toast.error('공유에 실패했습니다.');
        }
      }
    } else {
      // Web Share API를 지원하지 않는 경우 링크 복사로 대체
      toast('사용하시는 브라우저에서는 공유 기능을 지원하지 않습니다. 링크를 복사합니다.', { icon: 'ℹ️' });
      handleCopyLink();
    }
    onClose();
  };

  const AnimatePresenceSafe = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

  return (
    <AnimatePresenceSafe>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-t-[32px] pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="px-6 pt-6" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">약속 공유하기</h3>
                <button onClick={onClose} className="p-2 -mr-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="px-6 space-y-3">
              <button onClick={handleShare} className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl">
                  <Share2 size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800 dark:text-gray-200">다른 앱으로 공유</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">카카오톡, 메시지 등으로 초대 링크를 보냅니다.</p>
                </div>
              </button>
              <button onClick={handleCopyLink} className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl">
                  <Link size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800 dark:text-gray-200">링크 복사</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">초대 링크를 클립보드에 복사합니다.</p>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresenceSafe>
  );
};

export default ShareMeetingModal;
