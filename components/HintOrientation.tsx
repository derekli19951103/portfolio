import Image from "next/image";

export const HintOrientation = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "black",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 40,
            textAlign: "center",
            width: "100%",
            marginBottom: 20,
          }}
        >
          Please Use Landscape Mode
        </div>
        <Image
          src="/orientation-icon.png"
          alt="..."
          width={200}
          height={200}
          style={{ filter: "invert(100%)" }}
        />
      </div>
    </div>
  );
};
