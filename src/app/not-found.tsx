import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <FileQuestion className="text-faint mb-1 size-8" strokeWidth={1.5} />
      <h1 className="text-foreground text-2xl font-bold tracking-tight">ไม่พบหน้านี้</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        ลิงก์อาจถูกย้ายหรือไม่มีอยู่จริง ลองกลับไปหน้าหลักดูอีกครั้ง
      </p>
      <div className="mt-2">
        <Button asChild>
          <Link href="/">กลับหน้าหลัก</Link>
        </Button>
      </div>
    </div>
  );
}
