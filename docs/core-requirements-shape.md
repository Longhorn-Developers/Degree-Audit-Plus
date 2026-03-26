# Core Requirements Shape

This is a simple way to store core requirements in code.

## Main idea

- `CourseRef` = one subject with many course numbers
- `RequirementNode` = one `OR` group
- `requirements` = many nodes, treated as `AND`
- `count` = how many classes are needed from that node

## Types

```ts
export type CourseRef = {
  subject: string;
  numbers: string[];
};

export type RequirementNode = {
  courses: CourseRef[];
  count?: number;
};

export type CoreRequirement = {
  code: string;
  label: string;
  hours: number;
  requirements: RequirementNode[];
};
```

## Simple example

This:

```ts
{
  courses: [
    { subject: "RHE", numbers: ["306", "306Q"] },
    { subject: "E", numbers: ["303C"] },
    { subject: "TC", numbers: ["303C"] },
  ],
}
```

means:

`RHE 306` or `RHE 306Q` or `E 303C` or `TC 303C`

## Full example

Communication can be modeled like this:

```ts
const communication: CoreRequirement = {
  code: "010",
  label: "Communication",
  hours: 6,
  requirements: [
    {
      courses: [
        { subject: "RHE", numbers: ["306", "306Q"] },
        { subject: "E", numbers: ["303C"] },
        { subject: "TC", numbers: ["303C"] },
      ],
    },
    {
      courses: [
        { subject: "AAS", numbers: ["314", "320K", "325C"] },
        { subject: "AFR", numbers: ["315", "315T", "330R"] },
        { subject: "ADV", numbers: ["345J", "370J"] },
      ],
    },
  ],
};
```

This means:

- take one class from the first node
- and one class from the second node

## Choose 2 example

```ts
{
  courses: [
    { subject: "HIS", numbers: ["315K"] },
    { subject: "HIS", numbers: ["315L"] },
    { subject: "AMS", numbers: ["315"] },
  ],
  count: 2,
}
```

This means:

take any 2 classes from that node

## Why this works well

- simple to read
- simple to edit
- good for long `OR` lists
- supports multiple `AND` groups
- supports simple "choose N" rules

## Limitation

This is not a full parser for every possible catalog rule. It is a simple structure for the common cases.
