import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Question, QuestionType } from "@/types/tppr-paper";

export function QuestionEditor({
    question,
    onChange,
}: {
    question: Question;
    onChange: (q: Question) => void;
}) {
    return (
        <div className="space-y-4 px-4">
            <Field>
                <FieldLabel htmlFor="q-type">Type</FieldLabel>
                <Select
                    value={question.type}
                    onValueChange={(v) =>
                        onChange({ ...question, type: v as QuestionType })}
                >
                    <SelectTrigger id="q-type" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                        <SelectItem value="short_answer">Short answer</SelectItem>
                        <SelectItem value="long_answer">Long answer</SelectItem>
                    </SelectContent>
                </Select>
            </Field>

            <Field>
                <FieldLabel htmlFor="q-marks">Marks</FieldLabel>
                <Input
                    id="q-marks"
                    type="number"
                    min={1}
                    value={question.marks}
                    onChange={(e) =>
                        onChange({ ...question, marks: Number(e.target.value) })}
                />
            </Field>

            {/* next: stimulus blocks, content blocks, options/parts editors */}
        </div>
    );
}