export default function PdfViewerPage() {
  return (
    <div className="w-full h-screen">
      <iframe
        src="/api/pdf"
        className="w-full h-full border-0"
        title="SCH_1606214.a_searchable.PDF"
      />
    </div>
  );
}
