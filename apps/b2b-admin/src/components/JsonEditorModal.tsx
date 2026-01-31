import Editor from "@monaco-editor/react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface JsonEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: any;
  onSave: (value: any) => Promise<void>;
}

export function JsonEditorModal({ open, onOpenChange, initialValue, onSave }: JsonEditorModalProps) {
  const [value, setValue] = useState(JSON.stringify(initialValue || {}, null, 2));
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>高级 JSON 编辑器</DialogTitle>
        </DialogHeader>
        <div className="flex-1 border rounded-md overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="json"
            value={value}
            theme="vs-dark"
            onChange={(v: any) => {
              setValue(v || "");
              setIsValid(true);
            }}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        </div>
        {!isValid && <p className="text-red-500 text-xs">无效的 JSON 格式</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存更改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}