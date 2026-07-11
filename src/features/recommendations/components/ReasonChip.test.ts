import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { ReasonChip, primaryReasonLabel } from "./ReasonChip";
import type { RecommendationReason } from "@/services/apiClient";

const reason = (label: string): RecommendationReason => ({
  type: "genre_similar",
  label,
});

describe("primaryReasonLabel", () => {
  it("returns the first reason's label", () => {
    expect(primaryReasonLabel([reason("Combina com seus gêneros favoritos")])).toBe(
      "Combina com seus gêneros favoritos",
    );
  });

  it("returns null when reasons is undefined", () => {
    expect(primaryReasonLabel(undefined)).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(primaryReasonLabel([])).toBeNull();
  });

  it("returns null when the first label is blank", () => {
    expect(primaryReasonLabel([reason("   ")])).toBeNull();
  });

  it("uses only the first label when several reasons exist", () => {
    expect(
      primaryReasonLabel([
        reason("Porque você assistiu Attack on Titan"),
        reason("Em alta agora"),
      ]),
    ).toBe("Porque você assistiu Attack on Titan");
  });
});

describe("ReasonChip", () => {
  it("renders an element exposing the label", () => {
    const el = ReasonChip({
      reasons: [reason("Porque você assistiu Attack on Titan")],
    }) as ReactElement<{ title: string }>;
    expect(el).not.toBeNull();
    expect(el.props.title).toBe("Porque você assistiu Attack on Titan");
  });

  it("renders only the first label when several reasons exist", () => {
    const el = ReasonChip({
      reasons: [reason("Parecido com Naruto"), reason("Em alta agora")],
    }) as ReactElement<{ title: string }>;
    expect(el.props.title).toBe("Parecido com Naruto");
  });

  it("returns null when reasons is undefined", () => {
    expect(ReasonChip({ reasons: undefined })).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(ReasonChip({ reasons: [] })).toBeNull();
  });
});
