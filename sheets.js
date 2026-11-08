// 도면집 22장 (cad_sheets.py → PDF → assets/sheets/*.jpg). link = 3D 에서 같이 볼 상태
export const SHEETS = [
{
"dwg": "G-000",
"name": "표지",
"g": "공통"
},
{
"dwg": "G-001",
"name": "도면목록표",
"g": "공통"
},
{
"dwg": "A-001",
"name": "외부 투시도",
"g": "투시도 · 다이어그램",
"link": {
"r": "R08"
}
},
{
"dwg": "A-002",
"name": "실내 투시도",
"g": "투시도 · 다이어그램",
"link": {
"r": "R12"
}
},
{
"dwg": "A-003",
"name": "형태 다이어그램",
"g": "투시도 · 다이어그램",
"link": {
"legal": true
}
},
{
"dwg": "A-004",
"name": "아이소·단면 렌더",
"g": "투시도 · 다이어그램",
"link": {
"r": "R03"
}
},
{
"dwg": "A-010",
"name": "건축개요도",
"g": "건축 개요 · 대지"
},
{
"dwg": "A-014",
"name": "배치도",
"g": "건축 개요 · 대지"
},
{
"dwg": "A-015",
"name": "대지종횡단면도",
"g": "건축 개요 · 대지"
},
{
"dwg": "A-016",
"name": "건축·바닥 면적산출도",
"g": "건축 개요 · 대지",
"link": {
"floor": "1"
}
},
{
"dwg": "A-311",
"name": "1층 평면도",
"g": "평면도",
"link": {
"floor": "1"
}
},
{
"dwg": "A-312",
"name": "2층 평면도",
"g": "평면도",
"link": {
"floor": "2"
}
},
{
"dwg": "A-313",
"name": "3층 평면도",
"g": "평면도",
"link": {
"floor": "3"
}
},
{
"dwg": "A-314",
"name": "지붕층 평면도",
"g": "평면도",
"link": {
"view": "overview"
}
},
{
"dwg": "A-321",
"name": "남서측(정면) 입면도",
"g": "입면도",
"link": {
"view": "street"
}
},
{
"dwg": "A-322",
"name": "북동측(배면) 입면도",
"g": "입면도",
"link": {
"view": "north"
}
},
{
"dwg": "A-323",
"name": "북서측 입면도",
"g": "입면도",
"link": {
"view": "north"
}
},
{
"dwg": "A-324",
"name": "남동측 입면도",
"g": "입면도",
"link": {
"view": "overview"
}
},
{
"dwg": "A-331",
"name": "종단면도 A-A",
"g": "단면 · 상세",
"link": {
"sec": "A"
}
},
{
"dwg": "A-332",
"name": "횡단면도 B-B",
"g": "단면 · 상세",
"link": {
"sec": "B"
}
},
{
"dwg": "A-340",
"name": "아이소메트릭",
"g": "단면 · 상세",
"link": {
"view": "overview"
}
},
{
"dwg": "A-351",
"name": "부분 상세 단면도",
"g": "단면 · 상세",
"link": {
"sec": "A"
}
}
];
export const sheetImg = (d, thumb) => `assets/sheets/${d}${thumb ? "_t" : ""}.jpg`;
export const sheetsFor = (key) => SHEETS.filter((s) => s.link && Object.entries(key).every(([k, v]) => s.link[k] === v));
