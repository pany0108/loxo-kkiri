import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, FileText } from 'lucide-react';
import { ImagePreviewModal } from 'components';

const SharedMediaList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // [수정] location.state의 타입을 명확히 하여 타입 안정성 확보
  // location.state가 any 타입으로 취급되어 발생할 수 있는 빌드 오류를 방지합니다.
  const { media = [], files = [], title = '일정' } = (location.state as { media?: string[]; files?: { name: string; type: string }[]; title?: string }) || {};

  const [activeTab, setActiveTab] = React.useState<'photo' | 'doc'>('photo');
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 pb-2 flex items-center gap-3 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-gray-50">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-90"
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900 truncate">공유된 미디어 ({title})</h1>
      </nav>
      {/* 탭 컨트롤 */}
      <div className="px-6 pt-4">
        <div className="flex p-1 bg-gray-100 rounded-[16px]">
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all
              ${activeTab === 'photo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            <ImageIcon size={16} /> 사진 <span className="opacity-60 text-[11px]">{media.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('doc')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all
              ${activeTab === 'doc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            <FileText size={16} /> 문서 <span className="opacity-60 text-[11px]">{files.length}</span>
          </button>
        </div>
      </div>
      {/* 콘텐츠 영역 */}
      <div className="flex-1 px-6 pt-6 pb-12 overflow-y-auto">
        {activeTab === 'photo' ? (
          <>
            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {media.map((src: string, idx: number) => (
                  // [개선] div 대신 button을 사용하여 웹 접근성 향상
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
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
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
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-blue-500">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[14px] font-bold text-gray-900 truncate">{file.name}</p>
                    <p className="text-[11px] font-medium text-gray-400">문서 파일</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
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
