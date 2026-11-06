const logoUrl = new URL("../assets/annu-logo.svg", import.meta.url).href;
export function Brand() {
  return (
    <div className="brand">
      <img
        className="brand-logo"
        src={logoUrl}
        alt="annu."
        width={110}
        height={40}
      />
    </div>
  );
}
