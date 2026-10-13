import json,os,sys
sys.stdout.reconfigure(encoding='utf-8')
H=os.path.dirname(os.path.abspath(sys.argv[0])) if len(sys.argv)>0 and sys.argv[0] else '.'
H=sys.argv[1]
S=json.load(open(os.path.join(H,'verify_solved.json'),encoding='utf-8-sig'))
for rd in (1,2):
    d=json.load(open(os.path.join(H,f'round{rd}.json'),encoding='utf-8'))
    key=[q['answer'] for s in d['sets'] for q in s['qs']]
    diff=[(i+1,a,b) for i,(a,b) in enumerate(zip(S[str(rd)],key)) if a!=b]
    print(f'{rd}회: {len(key)}문항 대조, 다른 문항 {len(diff)}개', diff)
