import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-faint font-mono text-sm">404</p>
      <h1 className="text-foreground text-2xl font-bold">ไม่พบหน้านี้</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        ลิงก์อาจถูกย้ายหรือไม่มีอยู่จริง ลองกลับไปหน้าหลักดูอีกครั้ง
      </p>
      <Button asChild className="mt-2">
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </div>
  );
}
