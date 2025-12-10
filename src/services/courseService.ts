
import type { Course, CourseItem } from '../types';

export const parseContent = (content: string): CourseItem[] => {
  return content
    .trim()
    .split('\n')
    .map(line => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(/\s+/);
      const hanzi = parts[0]?.trim();
      const pinyin = parts[1]?.trim();
      
      if (!hanzi) return null;
      return { 
        hanzi: hanzi, 
        pinyin: pinyin || '' 
      };
    })
    .filter((item): item is CourseItem => item !== null);
};

// Initial empty array. Courses will be populated via fetchExternalCourses
export const COURSES: Course[] = [];

export const getCourse = (courseId: string): Course | undefined => {
  return COURSES.find(c => c.id === courseId);
};

/**
 * Attempts to load a list of courses from a manifest.json file in the courses directory.
 * This allows automatic loading of new files without rebuilding the app code, 
 * provided the manifest.json is updated.
 */
export const fetchExternalCourses = async (): Promise<Course[]> => {
  try {
    // 1. Fetch the manifest list (e.g., ["output_part_3.txt", "output_part_4.txt"])
    const manifestRes = await fetch('courses/manifest.json');
    if (!manifestRes.ok) return [];

    const fileList: string[] = await manifestRes.json();
    if (!Array.isArray(fileList)) return [];

    // 2. Fetch each file in parallel
    const coursePromises = fileList.map(async (filename) => {
      try {
        const res = await fetch(`courses/${filename}`);
        if (!res.ok) return null;
        const text = await res.text();
        const items = parseContent(text);
        
        if (items.length === 0) return null;

        // Try to generate a nice name
        let displayName = filename.replace('.txt', '');
        // Extract number if possible for better sorting/display (e.g. output_part_5 -> 练习课程 5)
        const match = displayName.match(/part_(\d+)/);
        if (match) {
            displayName = `练习课程 ${match[1]}`;
        } else {
            // Fallback for other naming conventions
             displayName = displayName.replace(/^output_/, '').replace(/_/g, ' ');
        }

        return {
          id: filename, // Use filename as ID to avoid collision
          name: displayName,
          items,
          rawContent: text
        } as Course;
      } catch (e) {
        console.warn(`Failed to load course file: ${filename}`, e);
        return null;
      }
    });

    const results = await Promise.all(coursePromises);
    
    // Filter out failed loads and sort by number if possible
    const validCourses = results.filter((c): c is Course => c !== null);
    
    // Optional: Sort numerically if they follow the pattern "练习课程 X"
    return validCourses.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

  } catch (error) {
    console.debug('No external courses manifest found (courses/manifest.json).');
    return [];
  }
};
