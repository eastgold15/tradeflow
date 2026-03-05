import Editor from "@monaco-editor/react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JsonEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: any;
  onSave: (value: any) => Promise<void>;
}

export function JsonEditorModal({
  open,
  onOpenChange,
  initialValue,
  onSave,
}: JsonEditorModalProps) {
  const [value, setValue] = useState(
    JSON.stringify(initialValue || {}, null, 2)
  );
  const [isValid, setIsValid] = useState(true);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(value);
      await onSave(parsed);
      onOpenChange(false);
    } catch (e) {
      setIsValid(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[80vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>高级 JSON 编辑器</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden rounded-md border">
          <Editor
            defaultLanguage="json"
            height="100%"
            onChange={(v: any) => {
              setValue(v || "");
              setIsValid(true);
            }}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
            theme="vs-dark"
            value={value}
          />
        </div>
        {!isValid && <p className="text-red-500 text-xs">无效的 JSON 格式</p>}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
          <Button onClick={handleSave}>保存更改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
