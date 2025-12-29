import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Users, ChevronRight, CalendarCheck, Sparkles, ChevronLeft } from 'lucide-react';

const ProposeMeeting = () => {
  const navigate = useNavigate();

  // 진행 중인 약속 데이터 (나중에는 서버에서 받아올 부분)
  const ongoingMeetings = [
    { id: '1', title: '강남역 삼겹살 파티 🥓', status: 'VOTING', members: 4, dday: 'D-2' },
    { id: '2', title: '주말 한강 피크닉 돗자리', status: 'PENDING', members: 3, dday: '투표중' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-4 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-8 pt-4 pb-24 overflow-y-auto max-w-md mx-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            소중한 사람들과의 <br />
            <span className="text-blue-600">약속을 잡아보세요</span>
          </h2>
        </div>

        {/* [버튼] 새 약속 만들기 */}
        <button
          onClick={() => navigate('/propose/create')}
          className="w-full h-[80px] bg-blue-600 rounded-[24px] flex items-center justify-between px-6 shadow-xl shadow-blue-100 active:scale-[0.98] transition-all group mb-8"
        >
          <div className="text-left">
            <p className="text-blue-200 text-[11px] font-bold mb-1 tracking-wider uppercase">New Meeting</p>
            <h3 className="text-white font-black text-[17px]">새로운 약속 제안하기</h3>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white group-hover:bg-white group-hover:text-blue-600 transition-all">
            <Plus size={24} strokeWidth={3} />
          </div>
        </button>

        {/* [리스트] 진행 중인 약속 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> 진행 중인 약속
            </h2>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{ongoingMeetings.length}개</span>
          </div>

          {ongoingMeetings.length > 0 ? (
            <div className="space-y-3">
              {ongoingMeetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => navigate(`/meeting/report/${meeting.id}`)}
                  className="w-full bg-white p-5 rounded-[24px] border-2 border-gray-50 flex items-center justify-between active:scale-[0.98] transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 group"
                >
                  <div className="text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md ${meeting.status === 'VOTING' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        {meeting.status === 'VOTING' ? '투표 진행중' : '시간 조율중'}
                      </span>
                      <span className="text-[11px] font-bold text-gray-300">| {meeting.dday}</span>
                    </div>
                    <h4 className="font-black text-gray-800 text-[16px] group-hover:text-blue-600 transition-colors">{meeting.title}</h4>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Users size={14} />
                      <span className="text-[12px] font-bold">{meeting.members}명 참여중</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // 약속이 없을 때 보여줄 화면
            <div className="py-12 text-center space-y-3 bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-100">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-gray-300 mb-2 shadow-sm">
                <CalendarCheck size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 font-bold text-[13px]">현재 진행 중인 약속이 없어요.</p>
                <p className="text-gray-400 text-[11px]">새로운 약속을 만들어보세요!</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProposeMeeting;
