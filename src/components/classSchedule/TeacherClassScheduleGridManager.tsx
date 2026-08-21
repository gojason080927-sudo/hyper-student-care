import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ScheduleTemplateType } from '../../types/records'

import { useData } from '../../hooks/useData'

import { GRADES } from '../../utils/labels'

import { btnPrimary, inputClass } from '../../utils/labels'

import { getClassOptionsForGrade, isActiveGrade } from '../../utils/studentGradeClass'

import {

  SCHEDULE_TEMPLATE_ORDER,

  SCHEDULE_TEMPLATES,

  buildGridRecord,

  cellKey,

  createEmptyTemplateDrafts,

  gridToTemplateDraft,

  removeGridRow,

} from '../../utils/scheduleGrid'

import { ScheduleGridTable } from './ScheduleGridTable'

import '../../styles/scheduleGrid.css'



type GridDraft = { timeLabels: string[]; cells: Record<string, string> }



export function TeacherClassScheduleGridManager() {

  const { classScheduleGrids, saveClassScheduleGrid, isSaving } = useData()

  const [grade, setGrade] = useState('')

  const [className, setClassName] = useState('')

  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplateType>('mon-sun')

  const [drafts, setDrafts] = useState<Record<ScheduleTemplateType, GridDraft>>(

    createEmptyTemplateDrafts(),

  )

  const [savedId, setSavedId] = useState<string | undefined>()

  const [formError, setFormError] = useState('')



  const classOptions = grade && isActiveGrade(grade) ? getClassOptionsForGrade(grade) : []



  const existing = useMemo(() => {

    if (!grade || !className) return undefined

    return classScheduleGrids.find(

      (grid) => grid.grade === grade && grid.className === className && grid.isActive,

    )

  }, [classScheduleGrids, className, grade])



  useEffect(() => {

    if (!grade || !className) {

      setDrafts(createEmptyTemplateDrafts())

      setSelectedTemplate('mon-sun')

      setSavedId(undefined)

      return

    }



    const record = classScheduleGrids.find(

      (item) => item.grade === grade && item.className === className,

    )



    const nextDrafts = createEmptyTemplateDrafts()

    if (record) {

      nextDrafts[record.templateType] = gridToTemplateDraft(record)

      setSelectedTemplate(record.templateType)

      setSavedId(record.id)

    } else {

      setSelectedTemplate('mon-sun')

      setSavedId(undefined)

    }

    setDrafts(nextDrafts)

  }, [grade, className, classScheduleGrids])



  const updateTimeLabel = useCallback(

    (templateType: ScheduleTemplateType, rowIndex: number, value: string) => {

      setDrafts((prev) => ({

        ...prev,

        [templateType]: {

          ...prev[templateType],

          timeLabels: prev[templateType].timeLabels.map((label, index) =>

            index === rowIndex ? value : label,

          ),

        },

      }))

    },

    [],

  )



  const updateCell = useCallback(

    (templateType: ScheduleTemplateType, rowIndex: number, day: string, value: string) => {

      setDrafts((prev) => ({

        ...prev,

        [templateType]: {

          ...prev[templateType],

          cells: {

            ...prev[templateType].cells,

            [cellKey(rowIndex, day)]: value,

          },

        },

      }))

    },

    [],

  )



  const addRow = useCallback((templateType: ScheduleTemplateType) => {

    setDrafts((prev) => ({

      ...prev,

      [templateType]: {

        timeLabels: [...prev[templateType].timeLabels, ''],

        cells: { ...prev[templateType].cells },

      },

    }))

  }, [])



  const removeRow = useCallback((templateType: ScheduleTemplateType, rowIndex: number) => {

    setDrafts((prev) => ({

      ...prev,

      [templateType]: removeGridRow(

        prev[templateType].timeLabels,

        prev[templateType].cells,

        rowIndex,

        templateType,

      ),

    }))

  }, [])



  const handleSave = async () => {

    setFormError('')

    if (isSaving) return



    if (!grade || !className) {

      setFormError('학년과 반/과정을 선택해 주세요.')

      return

    }



    const draft = drafts[selectedTemplate]

    const payload = buildGridRecord({

      id: savedId ?? existing?.id,

      grade,

      className,

      templateType: selectedTemplate,

      timeLabels: draft.timeLabels,

      cells: draft.cells,

      isActive: true,

    })



    await saveClassScheduleGrid(payload)

  }



  return (

    <div className="space-y-5">

      <div>

        <h2 className="text-lg font-bold text-navy-900">반별 수업 시간표 관리</h2>

        <p className="text-sm text-slate-600">

          학년·반을 선택한 뒤 시간표 Grid에 직접 입력하고, 사용할 템플릿 하나를 선택해 저장하세요.

        </p>

      </div>



      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <div>

            <label className="mb-1.5 block text-sm font-medium text-slate-600">학년</label>

            <select

              value={grade}

              onChange={(e) => {

                setGrade(e.target.value)

                setClassName('')

              }}

              className={inputClass()}

            >

              <option value="">선택</option>

              {GRADES.map((item) => (

                <option key={item} value={item}>

                  {item}

                </option>

              ))}

            </select>

          </div>

          <div>

            <label className="mb-1.5 block text-sm font-medium text-slate-600">반/과정</label>

            <select

              value={className}

              onChange={(e) => setClassName(e.target.value)}

              className={inputClass()}

              disabled={!grade}

            >

              <option value="">선택</option>

              {classOptions.map((option) => (

                <option key={option} value={option}>

                  {option}

                </option>

              ))}

            </select>

          </div>

        </div>

      </div>



      {!grade || !className ? (

        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">

          학년과 반/과정을 선택하면 시간표 Grid 3종이 표시됩니다.

        </div>

      ) : (

        <>

          <div className="space-y-6">

            {SCHEDULE_TEMPLATE_ORDER.map((templateType) => (

              <div key={templateType} className="space-y-3">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy-900">

                    <input

                      type="radio"

                      name="schedule-template"

                      checked={selectedTemplate === templateType}

                      onChange={() => setSelectedTemplate(templateType)}

                      className="h-4 w-4 border-slate-300 text-teal-600"

                    />

                    {SCHEDULE_TEMPLATES[templateType].label} 선택

                  </label>

                  <div className="flex flex-wrap items-center gap-2">

                    <button

                      type="button"

                      onClick={() => addRow(templateType)}

                      disabled={isSaving}

                      className="min-h-11 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-navy-900 disabled:opacity-50"

                    >

                      + 시간 행 추가

                    </button>

                  </div>

                </div>

                <ScheduleGridTable

                  templateType={templateType}

                  timeLabels={drafts[templateType].timeLabels}

                  cells={drafts[templateType].cells}

                  onTimeLabelChange={(rowIndex, value) =>

                    updateTimeLabel(templateType, rowIndex, value)

                  }

                  onCellChange={(rowIndex, day, value) =>

                    updateCell(templateType, rowIndex, day, value)

                  }

                  onDeleteRow={(rowIndex) => removeRow(templateType, rowIndex)}

                />

              </div>

            ))}

          </div>



          <div className="flex flex-wrap items-center gap-3">

            <button

              type="button"

              onClick={() => void handleSave()}

              disabled={isSaving}

              className={btnPrimary}

            >

              {isSaving ? '저장 중...' : '저장'}

            </button>

            {existing && (

              <span className="text-xs text-slate-500">

                마지막 저장: {SCHEDULE_TEMPLATES[existing.templateType].label} 템플릿

              </span>

            )}

            {formError && <span className="text-sm text-red-600">{formError}</span>}

          </div>

        </>

      )}

    </div>

  )

}


