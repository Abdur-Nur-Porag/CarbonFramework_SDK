
// Headings
function H1() { return create("h1"); }
function H2() { return create("h2"); }
function H3() { return create("h3"); }
function H4() { return create("h4"); }
function H5() { return create("h5"); }
function H6() { return create("h6"); }

// Containers (more)
function Div() { return create("div"); }
function Article() { return create("article"); }
function Section() { return create("section"); }
function Header() { return create("header"); }
function Footer() { return create("footer"); }
function Main() { return create("main"); }
function Aside() { return create("aside"); }
function Nav() { return create("nav"); }
function Figure() { return create("figure"); }
function Figcaption() { return create("figcaption"); }

// Text & Typography
function Paragraph() { return create("p"); }
function LongText() { return Paragraph(); }
function LargeText() { return H1(); }
function MediumText() { return H4(); }
function SmallText() { return create("small"); }
function Span() { return create("span"); }
function BoldText() { return create("b"); }
function ItalicText() { return create("i"); }
function SubText() { return create("sub"); }
function SupText() { return create("sup"); }

// Links
function Link(obj) { return create("a").attrs({ href: obj.address || "#" }); }
function Anchor(name = "") { return create("a").attrs({ name }); }

// Forms & Inputs
function Form() { return create("form"); }
function Input() { return create("input") }
function Textarea() { return create("textarea"); }
function Label() { return create("label")  }
function Select() { return create("select"); }
function Option(value = "", text = "") { return create("option").attrs({ value }).text(text); }
function Checkbox(name = "") { return Input("checkbox").attrs({ name }); }
function Radio(name = "") { return Input("radio").attrs({ name }); }
function SubmitButton(text = "Submit") { return Button().text(text).attrs({ type: "submit" }); }
function ResetButton(text = "Reset") { return Button().text(text).attrs({ type: "reset" }); }
function Button() { return create("button"); }

// Media
function Image(src = "", alt = "") { return create("img").attrs({ src, alt }); }
function Video(src = "") { return create("video").attrs({ src, controls: true }); }
function Audio(src = "") { return create("audio").attrs({ src, controls: true }); }
function Canvas() { return create("canvas"); }
function Picture() { return create("picture"); }
function Source(src = "", type = "") { return create("source").attrs({ src, type }); }

// Lists
function Ul() { return create("ul"); }
function Ol() { return create("ol"); }
function Li() { return create("li"); }
function Dl() { return create("dl"); }
function Dt() { return create("dt"); }
function Dd() { return create("dd"); }

// Tables
function Table() { return create("table"); }
function Tr() { return create("tr"); }
function Td() { return create("td"); }
function Th() { return create("th"); }
function Thead() { return create("thead"); }
function Tbody() { return create("tbody"); }
function Tfoot() { return create("tfoot"); }

// Interactive / Misc
function Details() { return create("details"); }
function Summary() { return create("summary"); }
function Hr() { return create("hr"); }
function Br() { return create("br"); }
function Embed(src = "") { return create("embed").attrs({ src }); }
function ObjectTag(data = "") { return create("object").attrs({ data }); }
function Iframe(src = "") { return create("iframe").attrs({ src }); }

// Semantic / Meta
function Meta() { return create("meta"); }
function LinkTag(rel = "", href = "") { return create("link").attrs({ rel, href }); }
function Script(src = "") { return create("script").attrs({ src }); }
function Style() { return create("style"); }
function CButton(){
  return Button().class(["circle"])
}
function CTButton(){
  return CButton().class(["transparent"])
}