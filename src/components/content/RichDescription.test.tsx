import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichDescription, RichDescriptionEditor } from "./RichDescription";

describe("course description formatting", () => {
  it("renders supported formatting and lists without treating HTML as executable", () => {
    const { container } = render(<RichDescription value={'**Bold** *Italic* __Underline__\n- Item\n[large]Large[/large]\n<img src=x onerror=alert(1)>'} />);
    expect(container.querySelector("strong")?.textContent).toBe("Bold");
    expect(container.querySelector("em")?.textContent).toBe("Italic");
    expect(container.querySelector("u")?.textContent).toBe("Underline");
    expect(screen.getByRole("listitem")).toHaveTextContent("Item");
    expect(container.querySelector(".rich-description__large")).toHaveTextContent("Large");
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });

  it("preserves existing plain text and adds formatting around selected text", () => {
    const change = vi.fn();
    render(<RichDescriptionEditor value="Legacy description" onChange={change} />);
    const editor = screen.getByRole("textbox", { name: "Mô tả" }) as HTMLTextAreaElement;
    editor.setSelectionRange(0, 6);
    fireEvent.click(screen.getByRole("button", { name: "In đậm" }));
    expect(change).toHaveBeenCalledWith("**Legacy** description");
  });
});
