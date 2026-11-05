import anyToJson from "../src/anyToJson.js";
import genbankToJson from "../src/genbankToJson";
import jsonToGenbank from "../src/jsonToGenbank";

// GenBank writes every nucleotide sequence with a/c/g/t, RNA included, so an
// mRNA record must come back out with its t's and its molecule type intact.
const mRNA = `LOCUS       test_mrna                 40 bp    mRNA    linear   SYN 01-JAN-2020
DEFINITION  synthetic mRNA used to test RNA round trips.
FEATURES             Location/Qualifiers
     CDS             1..30
                     /label="cds"
ORIGIN
        1 atgacgtttg ggtaccaatt tggatcctaa aaaaaaaaaa
//
`;
const bases = "atgacgtttgggtaccaatttggatcctaaaaaaaaaaaa";

const locusOf = genbank => genbank.split("\n")[0];
const originOf = genbank =>
  genbank
    .split("ORIGIN")[1]
    .replace(/\/\/[\s\S]*$/, "")
    .replace(/[\s\d]/g, "");

describe("RNA GenBank round trip", () => {
  it("keeps the t's and the molecule type of an mRNA record through anyToJson -> jsonToGenbank", async () => {
    const [result] = await anyToJson(mRNA, {
      fileName: "test_mrna.gb",
      acceptParts: true
    });
    expect(result.success).toBe(true);
    const seq = result.parsedSequence;
    expect(seq.isRna).toBe(true);
    expect(seq.sequenceTypeFromLocus).toBe("mRNA");
    expect(seq.sequence).toBe(bases);
    expect(result.messages.some(m => /Replaced/.test(m))).toBe(false);

    const out = jsonToGenbank(seq);
    expect(locusOf(out)).toMatch(/ 40 bp +mRNA +linear /);
    expect(originOf(out)).toBe(bases);

    const [reparsed] = genbankToJson(out);
    expect(reparsed.parsedSequence.sequence).toBe(bases);
    expect(reparsed.parsedSequence.sequenceTypeFromLocus).toBe("mRNA");
    expect(reparsed.parsedSequence.isRna).toBe(true);
  });

  it("keeps upper case t's as written", async () => {
    const [result] = await anyToJson(
      mRNA.replace(/ORIGIN[\s\S]*$/, m => m.toUpperCase()),
      {
        fileName: "test_mrna.gb"
      }
    );
    expect(result.parsedSequence.sequence).toBe(bases.toUpperCase());
  });

  it("converts t's to u's only when convertTToU is passed", async () => {
    const [result] = await anyToJson(mRNA, {
      fileName: "test_mrna.gb",
      convertTToU: true
    });
    expect(result.parsedSequence.sequence).toBe(bases.replace(/t/g, "u"));
    expect(result.messages).toContain('Replaced "t" with "u" 10 times');
    expect(locusOf(jsonToGenbank(result.parsedSequence))).toMatch(/ mRNA /);
  });

  it("keeps u's already present in an RNA record", () => {
    const [result] = genbankToJson(mRNA.replace("atgacgtttg", "augacguuug"));
    expect(result.parsedSequence.sequence).toBe("augacguuug" + bases.slice(10));
  });
});
