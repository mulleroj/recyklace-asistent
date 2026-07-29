import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WASTE_SCHEDULE } from '../../../wasteSchedule';
import {
    EditorRow,
    SCHEDULE_TYPE_CODES,
    SCHEDULE_TYPE_LABELS,
    ScheduleTypeCode,
    createRowId,
    formatCzechDate,
    getRowErrors,
    getWarnings,
    mergeRowsByDate,
    parsePastedTable,
    sortRows,
} from '../../utils/scheduleImport';
import { buildScheduleFile, downloadScheduleFile } from '../../utils/scheduleExport';

interface ScheduleEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const STEPS = ['Rok', 'Vložení dat', 'Kontrola', 'Stažení'];

const latestPublishedYear = () =>
    WASTE_SCHEDULE.reduce((max, entry) => Math.max(max, Number(entry.date.slice(0, 4))), 0);

const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({ isOpen, onClose }) => {
    const publishedYear = latestPublishedYear();
    const [step, setStep] = useState(0);
    const [year, setYear] = useState(publishedYear + 1);
    const [pasteText, setPasteText] = useState('');
    const [rows, setRows] = useState<EditorRow[]>([]);
    const [rowErrors, setRowErrors] = useState<string[]>([]);
    const [skippedLines, setSkippedLines] = useState<string[]>([]);
    const [warningsConfirmed, setWarningsConfirmed] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        headingRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const referenceCount = useMemo(
        () => WASTE_SCHEDULE.filter((entry) => entry.date.startsWith(`${publishedYear}-`)).length,
        [publishedYear]
    );

    if (!isOpen) return null;

    const yearExists = WASTE_SCHEDULE.some((entry) => entry.date.startsWith(`${year}-`));
    const validRows = rows.filter((row) => row.date && row.types.length > 0);
    const warnings = getWarnings(rows, year, referenceCount);

    const updateRow = (id: number, changes: Partial<EditorRow>) => {
        setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
        setRowErrors([]);
    };

    const toggleRowType = (row: EditorRow, type: ScheduleTypeCode) => {
        const types = row.types.includes(type)
            ? row.types.filter((existing) => existing !== type)
            : [...row.types, type];
        updateRow(row.id, { types });
    };

    const handleParse = () => {
        const result = parsePastedTable(pasteText);
        setRows(result.rows);
        setSkippedLines(result.skippedLines);
        setRowErrors([]);
    };

    const handleAddRow = () => {
        setRows((current) => [
            ...current,
            { id: createRowId(), date: '', rawDate: '', types: [], unknownTypes: [] },
        ]);
        setRowErrors([]);
    };

    const handleContinueToPreview = () => {
        const sorted = mergeRowsByDate(sortRows(rows));
        setRows(sorted);
        if (sorted.length === 0) {
            setRowErrors(['Kalendář je prázdný. Vložte tabulku nebo přidejte svoz ručně.']);
            return;
        }
        const errors = getRowErrors(sorted, year).map((issue) => issue.message);
        setRowErrors(errors);
        if (errors.length === 0) {
            setWarningsConfirmed(false);
            setStep(2);
        }
    };

    const handleDownload = () => {
        downloadScheduleFile(buildScheduleFile(WASTE_SCHEDULE, year, rows));
        setDownloaded(true);
    };

    const typeCounts = SCHEDULE_TYPE_CODES.map((type) => ({
        type,
        count: validRows.filter((row) => row.types.includes(type)).length,
    }));

    const errorForRowIndex = (index: number) =>
        rowErrors.filter((message) => message.startsWith(`Řádek ${index + 1}:`));

    const primaryButtonClass =
        'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed';
    const secondaryButtonClass =
        'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500';

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-editor-title"
        >
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white relative shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Zavřít správu kalendáře"
                        title="Zavřít správu kalendáře"
                        className="absolute top-3 right-3 w-11 h-11 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        ✕
                    </button>
                    <h2 id="schedule-editor-title" ref={headingRef} tabIndex={-1} className="text-xl font-black uppercase outline-none pr-12">
                        Správa svozového kalendáře
                    </h2>
                    <ol className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm" aria-label="Kroky průvodce">
                        {STEPS.map((label, index) => (
                            <li
                                key={label}
                                aria-current={index === step ? 'step' : undefined}
                                className={index === step ? 'font-black underline' : index < step ? 'text-emerald-100' : 'text-emerald-200/70'}
                            >
                                {index + 1}. {label}
                                {index < step ? ' ✓' : ''}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {step === 0 && (
                        <>
                            <p className="text-slate-700">
                                Aktuálně zveřejněný kalendář obsahuje rok {publishedYear}.
                                {' '}Připravujete kalendář pro rok {year}.
                            </p>
                            <div>
                                <label htmlFor="schedule-editor-year" className="block font-bold text-slate-800 mb-1">
                                    Rok kalendáře
                                </label>
                                <input
                                    id="schedule-editor-year"
                                    type="number"
                                    min={publishedYear - 5}
                                    max={publishedYear + 10}
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="border-2 border-slate-300 rounded-xl px-4 py-3 w-40 font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                                />
                            </div>
                            {yearExists && (
                                <p className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-800 font-semibold" role="alert">
                                    Kalendář pro tento rok už existuje. Pokračováním připravíte jeho náhradu.
                                </p>
                            )}
                            <div className="flex justify-end">
                                <button type="button" className={primaryButtonClass} onClick={() => setStep(1)}>
                                    Pokračovat na vložení dat
                                </button>
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <div>
                                <label htmlFor="schedule-editor-paste" className="block font-bold text-slate-800 mb-1">
                                    Tabulka svozů z Excelu
                                </label>
                                <p className="text-sm text-slate-600 mb-2">
                                    Označte v Excelu sloupce Datum a Druh odpadu, zkopírujte je a vložte sem.
                                    Například: „06.01.{year}&nbsp;&nbsp;Směsný“. Více druhů v jednom dni zapište
                                    jako „Plast + papír“.
                                </p>
                                <textarea
                                    id="schedule-editor-paste"
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    rows={6}
                                    className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 font-mono text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button type="button" className={secondaryButtonClass} onClick={handleParse}>
                                        Zpracovat tabulku
                                    </button>
                                    <button type="button" className={secondaryButtonClass} onClick={handleAddRow}>
                                        Přidat svoz
                                    </button>
                                </div>
                                {skippedLines.length > 0 && (
                                    <p className="mt-2 p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-800 text-sm" role="alert">
                                        Tyto řádky se nepodařilo přečíst (chybí oddělený sloupec s druhem odpadu):{' '}
                                        {skippedLines.join(' | ')}
                                    </p>
                                )}
                            </div>

                            {rowErrors.length > 0 && (
                                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-300 text-red-800 text-sm space-y-1" role="alert">
                                    {rowErrors.map((message) => (
                                        <p key={message}>{message}</p>
                                    ))}
                                </div>
                            )}

                            {rows.length > 0 && (
                                <ul className="space-y-3">
                                    {rows.map((row, index) => {
                                        const errors = errorForRowIndex(index);
                                        return (
                                            <li
                                                key={row.id}
                                                className={`border-2 rounded-xl p-3 ${errors.length > 0 || row.unknownTypes.length > 0 || !row.date ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400 w-14">Řádek {index + 1}</span>
                                                    <input
                                                        type="date"
                                                        value={row.date}
                                                        aria-label={`Datum svozu, řádek ${index + 1}`}
                                                        onChange={(e) => updateRow(row.id, { date: e.target.value, rawDate: e.target.value, unknownTypes: row.unknownTypes })}
                                                        className="border-2 border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setRows((current) => current.filter((r) => r.id !== row.id)); setRowErrors([]); }}
                                                        aria-label={`Odstranit svoz, řádek ${index + 1}`}
                                                        title="Odstranit svoz"
                                                        className="ml-auto text-red-600 hover:bg-red-50 font-bold px-3 py-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                                                    >
                                                        Odstranit
                                                    </button>
                                                </div>
                                                {!row.date && row.rawDate && (
                                                    <p className="text-sm text-red-700 mt-1">
                                                        Vložené datum „{row.rawDate}“ se nepodařilo přečíst – vyberte je znovu.
                                                    </p>
                                                )}
                                                {row.unknownTypes.length > 0 && (
                                                    <p className="text-sm text-red-700 mt-1">
                                                        Neznámý druh odpadu: {row.unknownTypes.map((t) => `„${t}“`).join(', ')} – zaškrtněte správný druh
                                                        a{' '}
                                                        <button
                                                            type="button"
                                                            className="underline font-bold"
                                                            onClick={() => updateRow(row.id, { unknownTypes: [] })}
                                                        >
                                                            odstraňte neznámý text
                                                        </button>
                                                        .
                                                    </p>
                                                )}
                                                <fieldset className="mt-2">
                                                    <legend className="sr-only">Druh odpadu, řádek {index + 1}</legend>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                        {SCHEDULE_TYPE_CODES.map((type) => (
                                                            <label key={type} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.types.includes(type)}
                                                                    onChange={() => toggleRowType(row, type)}
                                                                    className="h-4 w-4 accent-emerald-600"
                                                                />
                                                                {SCHEDULE_TYPE_LABELS[type]}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </fieldset>
                                                {errors.map((message) => (
                                                    <p key={message} className="text-sm text-red-700 mt-1" role="alert">{message}</p>
                                                ))}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            <div className="flex justify-between gap-2">
                                <button type="button" className={secondaryButtonClass} onClick={() => setStep(0)}>
                                    Zpět
                                </button>
                                <button type="button" className={primaryButtonClass} onClick={handleContinueToPreview}>
                                    Pokračovat na kontrolu
                                </button>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-slate-800 space-y-1">
                                <p><strong>Rok:</strong> {year}</p>
                                <p><strong>Počet svozových dnů:</strong> {validRows.length}</p>
                                {validRows.length > 0 && (
                                    <>
                                        <p><strong>První svoz:</strong> {formatCzechDate(validRows[0].date)}</p>
                                        <p><strong>Poslední svoz:</strong> {formatCzechDate(validRows[validRows.length - 1].date)}</p>
                                    </>
                                )}
                                <p>
                                    {typeCounts
                                        .map(({ type, count }) => `${SCHEDULE_TYPE_LABELS[type]}: ${count}`)
                                        .join(' · ')}
                                </p>
                            </div>

                            {warnings.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-800 text-sm space-y-2">
                                    <p className="font-bold">Upozornění (nebrání stažení, jen je zkontrolujte):</p>
                                    {warnings.map((warning) => (
                                        <p key={warning}>{warning}</p>
                                    ))}
                                    <label className="flex items-start gap-2 font-semibold text-slate-800">
                                        <input
                                            type="checkbox"
                                            checked={warningsConfirmed}
                                            onChange={(e) => setWarningsConfirmed(e.target.checked)}
                                            className="mt-1 h-4 w-4 accent-emerald-600"
                                        />
                                        Upozornění jsem zkontroloval(a), data jsou správně.
                                    </label>
                                </div>
                            )}

                            <div>
                                <h3 className="font-bold text-slate-800 mb-2">Náhled všech svozů</h3>
                                <ul className="max-h-64 overflow-y-auto border-2 border-slate-200 rounded-xl divide-y divide-slate-100">
                                    {validRows.map((row) => (
                                        <li key={row.id} className="px-3 py-2 text-sm text-slate-700 flex flex-wrap justify-between gap-2">
                                            <span>{formatCzechDate(row.date)}</span>
                                            <span className="font-semibold">
                                                {row.types.map((type) => SCHEDULE_TYPE_LABELS[type]).join(' + ')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex justify-between gap-2">
                                <button type="button" className={secondaryButtonClass} onClick={() => setStep(1)}>
                                    Zpět na úpravy
                                </button>
                                <button
                                    type="button"
                                    className={primaryButtonClass}
                                    disabled={warnings.length > 0 && !warningsConfirmed}
                                    onClick={() => setStep(3)}
                                >
                                    Pokračovat ke stažení
                                </button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <p className="text-slate-700">
                                Soubor bude obsahovat všechny dosavadní roky beze změny a nově připravený rok {year}.
                            </p>
                            <div className="flex justify-center">
                                <button type="button" className={primaryButtonClass} onClick={handleDownload}>
                                    Stáhnout soubor pro zveřejnění
                                </button>
                            </div>

                            {downloaded && (
                                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-slate-800 space-y-2" role="status">
                                    <p className="font-black">Soubor byl připraven, ale zatím není veřejný.</p>
                                    <ol className="list-decimal list-inside space-y-1 text-sm">
                                        <li>Uložte stažený soubor wasteSchedule.json.</li>
                                        <li>Předejte jej vývojovému asistentovi.</li>
                                        <li>Asistent zkontroluje data a nahradí stejnojmenný soubor v repozitáři.</li>
                                        <li>Po nasazení zkontrolujte první a poslední svoz roku {year}.</li>
                                    </ol>
                                    <p className="text-sm font-semibold">
                                        Stažením souboru se veřejná aplikace automaticky nezmění.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between gap-2">
                                <button type="button" className={secondaryButtonClass} onClick={() => setStep(2)}>
                                    Zpět na kontrolu
                                </button>
                                <button type="button" className={secondaryButtonClass} onClick={onClose}>
                                    Zavřít
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleEditorModal;
