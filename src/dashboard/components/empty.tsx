export function Empty({
  title = "No Data Yet",
  text = "Data will appear here as people visit your website.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
