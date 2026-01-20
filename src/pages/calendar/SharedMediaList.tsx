import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Image as ImageIcon } from 'lucide-react';

import { ImagePreviewModal, TopNav } from 'components';

const SharedMediaList = () => {
  const location = useLocation();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const { media = [], files = [], title = '일정' } = (location.state as { media?: string[]; files?: { name: string; type: string }[]; title?: string }) || {};

  const [activeTab, setActiveTab] = React.useState<'photo' | 'doc'>('photo');
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title={`공유된 미디어 (${title})`} />

      {/* 탭 컨트롤 */}
      <div className="px-6 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex p-1 bg-gray-100 rounded-[16px]">
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all
              ${activeTab === 'photo' ? 'bg-white text-main shadow-sm' : 'text-sub'}`}
          >
            <ImageIcon size={16} /> 사진 <span className="opacity-60 text-[11px]">{media.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('doc')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all
              ${activeTab === 'doc' ? 'bg-white text-main shadow-sm' : 'text-sub'}`}
          >
            <FileText size={16} /> 문서 <span className="opacity-60 text-[11px]">{files.length}</span>
          </button>
        </div>
      </div>
      {/* 콘텐츠 영역 */}
      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-12 overflow-y-auto">
        {activeTab === 'photo' ? (
          <>
            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {media.map((src: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className="aspect-square rounded-[12px] overflow-hidden border border-gray-100 relative group cursor-pointer"
                  >
                    <img src={src} alt={`shared-${idx}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-sub">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p className="text-[14px] font-bold">공유된 사진이 없습니다.</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {files.length > 0 ? (
              files.map((file: { name: string; type: string }, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-[20px] border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-primary">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[14px] font-bold text-main truncate">{file.name}</p>
                    <p className="text-[11px] font-medium text-sub">문서 파일</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-sub">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-[14px] font-bold">공유된 문서가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* 이미지 뷰어 모달 연결 */}
      {selectedImageIndex !== null && <ImagePreviewModal images={media} initialIndex={selectedImageIndex} onClose={() => setSelectedImageIndex(null)} />}
    </div>
  );
};

export default SharedMediaList;
