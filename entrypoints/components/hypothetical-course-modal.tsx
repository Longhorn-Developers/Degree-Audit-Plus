import React, { useState } from "react";
import Modal from "./common/modal";
import Button from "./common/button";

interface HypotheticalCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (courseData: HypotheticalCourse) => void;
}

export interface HypotheticalCourse {
  department: string;
  courseNumber: string;
  courseName: string;
  credits: number;
  grade: string;
  semester: string;
}

const SEMESTERS = [
  "Spring 2024",
  "Summer 2024",
  "Fall 2024",
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Spring 2026",
  "Summer 2026",
  "Fall 2026",
];

const GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

export default function HypotheticalCourseModal({
  isOpen,
  onClose,
  onSubmit,
}: HypotheticalCourseModalProps) {
  const [formData, setFormData] = useState<HypotheticalCourse>({
    department: "",
    courseNumber: "",
    courseName: "",
    credits: 3,
    grade: "A",
    semester: "Spring 2025",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "credits" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({
      department: "",
      courseNumber: "",
      courseName: "",
      credits: 3,
      grade: "A",
      semester: "Spring 2025",
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      department: "",
      courseNumber: "",
      courseName: "",
      credits: 3,
      grade: "A",
      semester: "Spring 2025",
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Add Hypothetical Course">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Department and Course Number Row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label
              htmlFor="department"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              placeholder="e.g., CS"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dap-primary focus:border-transparent"
              required
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="courseNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Course Number
            </label>
            <input
              type="text"
              id="courseNumber"
              name="courseNumber"
              value={formData.courseNumber}
              onChange={handleInputChange}
              placeholder="e.g., 314"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dap-primary focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Course Name */}
        <div>
          <label
            htmlFor="courseName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Course Name
          </label>
          <input
            type="text"
            id="courseName"
            name="courseName"
            value={formData.courseName}
            onChange={handleInputChange}
            placeholder="e.g., Data Structures"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dap-primary focus:border-transparent"
            required
          />
        </div>

        {/* Credits and Grade Row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label
              htmlFor="credits"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Credits
            </label>
            <input
              type="number"
              id="credits"
              name="credits"
              value={formData.credits}
              onChange={handleInputChange}
              min="1"
              max="12"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dap-primary focus:border-transparent"
              required
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="grade"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Grade
            </label>
            <select
              id="grade"
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dap-primary focus:border-transparent"
              required
            >
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Semester */}
        <div>
          <label
            htmlFor="semester"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Semester
          </label>
          <select
            id="semester"
            name="semester"
            value={formData.semester}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dap-primary focus:border-transparent"
            required
          >
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={handleCancel}
            color="black"
            fill="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" color="orange" fill="solid" className="flex-1">
            Add Course
          </Button>
        </div>
      </form>
    </Modal>
  );
}
