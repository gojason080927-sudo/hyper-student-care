# send-hub-push-notification — 학교 시험 리포트 푸시 (적용 전 원장 확인 필요, 코드는 아직 수정하지 않음)

앱은 발송 시 `event: 'school_exam_report_sent'` 를 보낸다. 엣지 함수가 이 이벤트를 모르면 `status: 'ignored'` 로 끝나 **푸시만 가지 않고** 나머지는 정상 동작한다.

`handleMathMonthlyReportSent` 와 같은 구조의 핸들러 1개 + 분기 1줄 추가:

- `PushEvent` 에 `'school_exam_report_sent'` 추가
- 수신자: `supabase.rpc('list_school_exam_push_recipients', { p_exam_id })` (마이그레이션에 포함됨)
- `claimDelivery(supabase, \`school_exam:${examId}:${student.id}\`)`
- 알림: title `HYPER 학교 시험 분석`, body `학교 시험 분석 리포트가 도착했습니다. 앱에서 확인해 주세요.`, url `/care/${key}/monthly-evaluation`
- 요청 처리부: `if (event === 'school_exam_report_sent' && entityId) return jsonResponse(await handleSchoolExamReportSent(supabase, entityId, body.studentIds ?? body.student_ids ?? []))`
