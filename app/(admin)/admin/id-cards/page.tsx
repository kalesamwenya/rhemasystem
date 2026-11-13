'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Cropper from 'react-easy-crop';
import { CreditCard, Download, LoaderCircle, Printer, Save, Search, Settings2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';

type CropArea = { x: number; y: number; width: number; height: number };

type ExpirySettings = {
  firstYearExpiryYear: string;
  secondYearExpiryYear: string;
};

type Student = {
  student_id: string;
  name: string;
  class: string;
};

type SavedCard = {
  year_of_study: 'first' | 'second';
  expires_on: string;
  issued_at: string;
  has_photo: boolean;
  has_pdf: boolean;
};

type LookupResponse = {
  data?: {
    student?: Student;
    card?: SavedCard | null;
  };
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT'];

function expiryDate(year: string): string {
  if (!year) return 'Not configured';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), 9, 31));
}

function suggestedStudyYear(cohort: string): 'first' | 'second' {
  return /^SY/i.test(cohort.trim()) ? 'second' : 'first';
}

function createCroppedPhoto(imageUrl: string, area: CropArea, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 680;
      canvas.height = 720;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Your browser could not prepare the cropped ID photo.'));
        return;
      }

      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('The cropped ID photo could not be created.'));
          return;
        }
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    };
    image.onerror = () => reject(new Error('The selected photo could not be opened for cropping.'));
    image.src = imageUrl;
  });
}

const CARD_WIDTH_MM = 85;
const CARD_HEIGHT_MM = 55;
const CARD_SIDE_PADDING_MM = 2.8;
const CARD_CONTENT_WIDTH_MM = CARD_WIDTH_MM - CARD_SIDE_PADDING_MM * 2;
const CARD_RENDER_SCALE = 12;
const cardPixels = (millimeters: number) => millimeters * CARD_RENDER_SCALE;
const cardFontPixels = (points: number) => points * 25.4 / 72 * CARD_RENDER_SCALE;

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.arcTo(x + width, y, x + width, y + radius, radius);
  context.lineTo(x + width, y + height - radius);
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  context.lineTo(x + radius, y + height);
  context.arcTo(x, y + height, x, y + height - radius, radius);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.closePath();
}

function drawContainedImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawCoveredImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const targetRatio = width / height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  if (imageRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const timeout = window.setTimeout(() => {
      reject(new Error('The student ID card image took too long to prepare.'));
    }, 15000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('The student ID card image could not be prepared for PDF generation.'));
    };
    image.src = src;
  });
}

async function loadBarcodeImage(svgElement: SVGSVGElement): Promise<HTMLImageElement> {
  const svg = svgElement.cloneNode(true) as SVGSVGElement;
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    return await loadImage(svgUrl);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function drawStudentIdCard(
  student: Student,
  expiryYear: string,
  expiry: string,
  logo: HTMLImageElement,
  photo: HTMLImageElement,
  barcode: HTMLImageElement,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = cardPixels(CARD_WIDTH_MM);
  canvas.height = cardPixels(CARD_HEIGHT_MM);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare the student ID card image.');

  const width = canvas.width;
  const height = canvas.height;
  const mm = cardPixels;
  context.save();
  roundedRectPath(context, 0, 0, width, height, mm(3));
  context.clip();

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#ffffff');
  background.addColorStop(0.55, '#f8fafc');
  background.addColorStop(1, '#eef4fa');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-18 * Math.PI / 180);
  context.globalAlpha = 0.02;
  const watermarkWidth = mm(14);
  const watermarkHeight = mm(12);
  for (let x = -width; x <= width; x += watermarkWidth) {
    for (let y = -height; y <= height; y += watermarkHeight) {
      context.drawImage(logo, x, y, watermarkWidth, watermarkHeight);
    }
  }
  context.restore();

  const accent = context.createLinearGradient(0, 0, width, 0);
  accent.addColorStop(0, '#172554');
  accent.addColorStop(0.55, '#1d4ed8');
  accent.addColorStop(1, '#f59e0b');
  context.fillStyle = accent;
  context.fillRect(0, 0, width, mm(1.3));

  const title = 'RHEMA BIBLE TRAINING COLLEGE';
  context.font = `900 ${cardFontPixels(7)}px Arial, sans-serif`;
  const logoSize = mm(8);
  const headerGap = mm(1.5);
  const headerWidth = logoSize + headerGap + context.measureText(title).width;
  const headerX = (width - headerWidth) / 2;
  drawContainedImage(context, logo, headerX, mm(7.5), logoSize, logoSize);
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = '#172554';
  context.fillText(title, headerX + logoSize + headerGap, mm(11.5));

  const contentCenterX = mm(CARD_SIDE_PADDING_MM + (CARD_CONTENT_WIDTH_MM - 22) / 2);
  context.textAlign = 'center';
  context.fillStyle = '#172554';
  context.font = `900 ${cardFontPixels(8)}px Arial, sans-serif`;
  context.fillText(student.name, contentCenterX, mm(21.9), mm(CARD_CONTENT_WIDTH_MM - 22));
  context.drawImage(barcode, contentCenterX - mm(24), mm(24.4), mm(48), mm(9));
  context.fillStyle = '#172554';
  context.font = `900 ${cardFontPixels(9)}px Arial, sans-serif`;
  context.fillText(student.student_id, contentCenterX, mm(35.1), mm(CARD_CONTENT_WIDTH_MM - 22));

  const photoX = mm(CARD_WIDTH_MM - CARD_SIDE_PADDING_MM - 20 + 1.5);
  const photoY = mm(19.5);
  const photoWidth = mm(17);
  const photoHeight = mm(18);
  context.save();
  roundedRectPath(context, photoX, photoY, photoWidth, photoHeight, mm(1.5));
  context.clip();
  context.fillStyle = '#e2e8f0';
  context.fillRect(photoX, photoY, photoWidth, photoHeight);
  drawCoveredImage(context, photo, photoX, photoY, photoWidth, photoHeight);
  context.restore();
  context.lineWidth = mm(0.2);
  context.strokeStyle = '#cbd5e1';
  roundedRectPath(context, photoX, photoY, photoWidth, photoHeight, mm(1.5));
  context.stroke();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${cardFontPixels(3.5)}px Arial, sans-serif`;
  const monthsWidth = mm(CARD_CONTENT_WIDTH_MM - 7.2);
  const monthCellWidth = monthsWidth / MONTHS.length;
  [43.1, 46].forEach((rowY, row) => {
    context.fillStyle = '#334155';
    context.fillText(expiryYear || '----', mm(CARD_SIDE_PADDING_MM + 3.6), mm(rowY));
    MONTHS.forEach((month, index) => {
      context.fillStyle = row === 0 ? '#b91c1c' : '#1d4ed8';
      context.fillText(
        month,
        mm(CARD_SIDE_PADDING_MM + 7.2) + monthCellWidth * (index + 0.5),
        mm(rowY),
      );
    });
  });

  context.fillStyle = '#475569';
  context.font = `700 ${cardFontPixels(4)}px Arial, sans-serif`;
  context.fillText(`Expires ${expiry}`, width / 2, mm(51.4), mm(CARD_CONTENT_WIDTH_MM - 2));
  context.restore();

  context.lineWidth = mm(0.15);
  context.strokeStyle = '#cbd5e1';
  roundedRectPath(context, mm(0.075), mm(0.075), width - mm(0.15), height - mm(0.15), mm(3));
  context.stroke();
  return canvas;
}

function waitForCardImages(cardNode: HTMLElement): Promise<HTMLImageElement[]> {
  const images = Array.from(cardNode.querySelectorAll('img'));
  return Promise.all(images.map((image) => {
    if (image.complete) {
      return image.naturalWidth > 0
        ? Promise.resolve(image)
        : Promise.reject(new Error('The school logo or student photo could not be loaded.'));
    }
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const finish = (error?: Error) => {
        window.clearTimeout(timeout);
        image.removeEventListener('load', handleLoad);
        image.removeEventListener('error', handleError);
        if (error) reject(error);
        else resolve(image);
      };
      const handleLoad = () => finish();
      const handleError = () => finish(new Error('The school logo or student photo could not be loaded.'));
      const timeout = window.setTimeout(
        () => finish(new Error('The school logo or student photo took too long to load.')),
        15000,
      );
      image.addEventListener('load', handleLoad, { once: true });
      image.addEventListener('error', handleError, { once: true });
    });
  }));
}

export default function StudentIdCardsPage() {
  const [settings, setSettings] = useState<ExpirySettings>({
    firstYearExpiryYear: '',
    secondYearExpiryYear: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [card, setCard] = useState<SavedCard | null>(null);
  const [studyYear, setStudyYear] = useState<'first' | 'second'>('first');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSaving, setCropSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedPdfUrl, setSavedPdfUrl] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [cardSaving, setCardSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');
  const [barcodeReadyFor, setBarcodeReadyFor] = useState('');
  const cardElement = useRef<HTMLDivElement>(null);
  const barcodeElement = useRef<SVGSVGElement>(null);
  const lookupSequence = useRef(0);
  const barcodeStudentId = student?.student_id ?? '';

  useEffect(() => {
    let active = true;
    api.studentIdCards.settings()
      .then((response: { data?: Partial<Record<keyof ExpirySettings, number | null>> }) => {
        if (!active) return;
        setSettings({
          firstYearExpiryYear: response.data?.firstYearExpiryYear == null ? '' : String(response.data.firstYearExpiryYear),
          secondYearExpiryYear: response.data?.secondYearExpiryYear == null ? '' : String(response.data.secondYearExpiryYear),
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setSettingsError(true);
          setSettingsMessage(error instanceof Error ? error.message : 'Unable to load ID card settings.');
        }
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (cropImageUrl.startsWith('blob:')) URL.revokeObjectURL(cropImageUrl);
    };
  }, [cropImageUrl]);

  useEffect(() => {
    return () => {
      if (savedPdfUrl.startsWith('blob:')) URL.revokeObjectURL(savedPdfUrl);
    };
  }, [savedPdfUrl]);

  useEffect(() => {
    if (!barcodeStudentId || !barcodeElement.current) return;
    let active = true;
    setBarcodeReadyFor('');
    import('jsbarcode')
      .then(({ default: JsBarcode }) => {
        if (!active || !barcodeElement.current) return;
        JsBarcode(barcodeElement.current, barcodeStudentId, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          height: 48,
          width: 1.15,
          lineColor: '#0f172a',
        });
        setBarcodeReadyFor(barcodeStudentId);
        setBarcodeError('');
      })
      .catch(() => {
        if (active) {
          setBarcodeReadyFor('');
          setBarcodeError('The student ID could not be rendered as a barcode.');
        }
      });
    return () => {
      active = false;
    };
  }, [barcodeStudentId, previewOpen]);

  const expiryYear = studyYear === 'first'
    ? settings.firstYearExpiryYear
    : settings.secondYearExpiryYear;
  const canReusePhoto = Boolean(card?.has_photo && !photoLoadError && photoPreviewUrl);

  const handleSettingsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstYear = settings.firstYearExpiryYear.trim();
    const secondYear = settings.secondYearExpiryYear.trim();
    const validYear = (year: string) => year === '' || (/^\d{4}$/.test(year) && Number(year) >= 2000 && Number(year) <= 2100);
    if (!validYear(firstYear) || !validYear(secondYear)) {
      setSettingsError(true);
      setSettingsMessage('Enter a whole expiry year between 2000 and 2100 for each year of study.');
      return;
    }

    setSettingsSaving(true);
    setSettingsError(false);
    setSettingsMessage('');
    try {
      const body = await api.studentIdCards.saveSettings({
        idCards: {
          firstYearExpiryYear: firstYear === '' ? null : Number(firstYear),
          secondYearExpiryYear: secondYear === '' ? null : Number(secondYear),
        },
      });
      const data = body?.data as Partial<Record<keyof ExpirySettings, number | null>> | undefined;
      setSettings({
        firstYearExpiryYear: data?.firstYearExpiryYear == null ? '' : String(data.firstYearExpiryYear),
        secondYearExpiryYear: data?.secondYearExpiryYear == null ? '' : String(data.secondYearExpiryYear),
      });
      setSettingsDirty(false);
      setSavedPdfUrl('');
      setSettingsMessage('ID card expiry settings saved. Cards expire on 31 October of the configured year.');
    } catch (error) {
      setSettingsError(true);
      setSettingsMessage(error instanceof Error ? error.message : 'Unable to save ID card settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const studentId = studentIdInput.trim();
    if (!studentId) {
      setMessageIsError(true);
      setMessage('Enter the student ID number to look up an existing student.');
      return;
    }

    const requestId = ++lookupSequence.current;
    setLookupLoading(true);
    setStudent(null);
    setCard(null);
    setPhotoFile(null);
    setPhotoPreviewUrl('');
    setPhotoLoadError(false);
    setCropImageUrl('');
    setCropOpen(false);
    setPreviewOpen(false);
    setSavedPdfUrl('');
    setMessage('');
    setBarcodeError('');

    try {
      const response = await api.studentIdCards.lookup(studentId) as LookupResponse;
      const foundStudent = response.data?.student;
      if (!foundStudent) throw new Error('The student lookup returned no student record.');
      if (requestId !== lookupSequence.current) return;

      const savedCard = response.data?.card ?? null;
      setStudent(foundStudent);
      setCard(savedCard);
      setStudyYear(savedCard?.year_of_study ?? suggestedStudyYear(foundStudent.class));

      if (savedCard?.has_photo) {
        try {
          const photo = await api.studentIdCards.file(foundStudent.student_id, 'photo') as Blob;
          const photoUrl = URL.createObjectURL(photo);
          if (requestId === lookupSequence.current) setPhotoPreviewUrl(photoUrl);
          else URL.revokeObjectURL(photoUrl);
        } catch {
          if (requestId === lookupSequence.current) setPhotoLoadError(true);
        }
      }

      if (savedCard?.has_pdf) {
        try {
          const pdf = await api.studentIdCards.file(foundStudent.student_id, 'pdf') as Blob;
          const pdfUrl = URL.createObjectURL(pdf);
          if (requestId === lookupSequence.current) setSavedPdfUrl(pdfUrl);
          else URL.revokeObjectURL(pdfUrl);
        } catch {
          if (requestId === lookupSequence.current) {
            setMessageIsError(true);
            setMessage('The saved PDF could not be opened. You can generate and save a replacement.');
          }
        }
      }
    } catch (error) {
      if (requestId === lookupSequence.current) {
        setMessageIsError(true);
        setMessage(error instanceof Error ? error.message : 'Unable to look up that student.');
      }
    } finally {
      if (requestId === lookupSequence.current) setLookupLoading(false);
    }
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessageIsError(true);
      setMessage('Choose a JPEG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setMessageIsError(true);
      setMessage('The ID photo must be smaller than 6 MB.');
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setCropImageUrl(URL.createObjectURL(file));
    setCropOpen(true);
    setMessage('');
  };

  const handleCropAndUsePhoto = async () => {
    if (!cropImageUrl || !croppedArea || !student) {
      setMessageIsError(true);
      setMessage('Position the photo in the frame before applying the crop.');
      return;
    }

    setCropSaving(true);
    try {
      const safeStudentId = student.student_id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const croppedPhoto = await createCroppedPhoto(cropImageUrl, croppedArea, `student-id-${safeStudentId}.jpg`);
      setPhotoFile(croppedPhoto);
      setPhotoLoadError(false);
      setPhotoPreviewUrl(URL.createObjectURL(croppedPhoto));
      setSavedPdfUrl('');
      setCropOpen(false);
      setCropImageUrl('');
      setMessageIsError(false);
      setMessage('Cropped ID photo is ready to preview on the card.');
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Unable to crop this ID photo.');
    } finally {
      setCropSaving(false);
    }
  };

  const cancelPhotoCrop = () => {
    setCropOpen(false);
    setCropImageUrl('');
    setCroppedArea(null);
  };

  const handleGenerateAndSave = async () => {
    const cardNode = cardElement.current;
    if (!student || !cardNode) return;
    if (settingsDirty) {
      setMessageIsError(true);
      setMessage('Save the expiry settings before generating a card.');
      return;
    }
    if (!expiryYear) {
      setMessageIsError(true);
      setMessage(`Configure the ${studyYear} year expiry year before issuing this card.`);
      return;
    }
    if (!photoFile && !canReusePhoto) {
      setMessageIsError(true);
      setMessage('Upload an ID photo before issuing this student card.');
      return;
    }
    if (barcodeError) {
      setMessageIsError(true);
      setMessage(barcodeError);
      return;
    }
    if (barcodeReadyFor !== student.student_id) {
      setMessageIsError(true);
      setMessage('The barcode is still being prepared. Try again in a moment.');
      return;
    }

    setCardSaving(true);
    setMessageIsError(false);
    setMessage('Preparing the card images...');
    setSavedPdfUrl('');
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const cardImages = await waitForCardImages(cardNode);
      const logoImage = cardImages.find((image) => image.alt === 'Emit Academy logo');
      const photoImage = cardImages.find((image) => image.alt === `${student.name} ID photo`);
      if (!logoImage || !photoImage) throw new Error('The school logo or student photo could not be loaded.');
      if (!barcodeElement.current) throw new Error('The student ID barcode could not be prepared for PDF generation.');

      setMessage('Rendering the ID card...');
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const barcodeImage = await loadBarcodeImage(barcodeElement.current);
      const cardCanvas = drawStudentIdCard(
        student,
        expiryYear,
        expiryDate(expiryYear),
        logoImage,
        photoImage,
        barcodeImage,
      );

      setMessage('Creating the PDF...');
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const { jsPDF } = await import('jspdf');
      const pdfDocument = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
        compress: true,
      });
      pdfDocument.addImage(cardCanvas, 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');
      const pdf = pdfDocument.output('blob');
      if (!(pdf instanceof Blob) || pdf.type !== 'application/pdf' || pdf.size === 0) {
        throw new Error('The ID card PDF generator returned an invalid document.');
      }
      if (pdf.size > 15 * 1024 * 1024) {
        throw new Error('The generated ID card PDF is too large to save. Try using a smaller photo.');
      }

      setMessage('Saving the generated ID card...');
      await api.studentIdCards.save(student.student_id, studyYear, pdf, photoFile);
      const pdfUrl = URL.createObjectURL(pdf);
      setSavedPdfUrl(pdfUrl);
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      downloadLink.download = `Rhema-ID-${student.student_id.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(downloadLink);
      try {
        downloadLink.click();
      } finally {
        downloadLink.remove();
      }
      setCard({
        year_of_study: studyYear,
        expires_on: `${expiryYear}-10-31`,
        issued_at: new Date().toISOString(),
        has_photo: true,
        has_pdf: true,
      });
      setPhotoLoadError(false);
      setMessageIsError(false);
      setMessage('Student ID card generated and saved. The PDF download has started; use Download PDF if your browser blocks it.');
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Unable to generate and save this ID card.');
    } finally {
      setCardSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">IT &amp; Media</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-950">
            <CreditCard className="h-6 w-6 text-blue-700" />
            Student ID Cards
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Look up a student using their existing ID number, add an ID photo, and issue a printable card PDF.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Settings2 className="mt-0.5 h-5 w-5 text-blue-700" />
          <div>
            <h2 className="font-black text-slate-900">Card expiry configuration</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Set the applicable expiry year for each study year. Issued cards expire on 31 October and retain that date when settings later change.
            </p>
          </div>
        </div>
        <form onSubmit={handleSettingsSave} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
            First-year expiry year
            <input
              type="number"
              min="2000"
              max="2100"
              value={settings.firstYearExpiryYear}
              onChange={(event) => {
                setSettings((current) => ({ ...current, firstYearExpiryYear: event.target.value }));
                setSettingsDirty(true);
                setSettingsMessage('');
              }}
              disabled={settingsLoading || settingsSaving}
              placeholder="e.g. 2026"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
            />
            <span className="mt-1 block normal-case text-slate-500">{expiryDate(settings.firstYearExpiryYear)}</span>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Second-year expiry year
            <input
              type="number"
              min="2000"
              max="2100"
              value={settings.secondYearExpiryYear}
              onChange={(event) => {
                setSettings((current) => ({ ...current, secondYearExpiryYear: event.target.value }));
                setSettingsDirty(true);
                setSettingsMessage('');
              }}
              disabled={settingsLoading || settingsSaving}
              placeholder="e.g. 2027"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
            />
            <span className="mt-1 block normal-case text-slate-500">{expiryDate(settings.secondYearExpiryYear)}</span>
          </label>
          <button
            type="submit"
            disabled={settingsLoading || settingsSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {settingsSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save expiry
          </button>
        </form>
        {settingsMessage && (
          <p role="status" className={`mt-3 text-sm ${settingsError ? 'text-rose-700' : 'text-emerald-700'}`}>
            {settingsMessage}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black text-slate-900">Find an existing student</h2>
        <p className="mt-1 text-sm text-slate-600">The card number and barcode come from the student record. No new student ID is generated.</p>
        <form onSubmit={handleLookup} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="student-id-lookup">Student ID number</label>
          <input
            id="student-id-lookup"
            value={studentIdInput}
            onChange={(event) => setStudentIdInput(event.target.value)}
            placeholder="Enter student ID number"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          />
          <button
            type="submit"
            disabled={lookupLoading || !studentIdInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {lookupLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Look up student
          </button>
        </form>
      </section>

      {student && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">{student.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{student.student_id} <span className="mx-1">·</span> {student.class}</p>
              </div>
              {card && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  Existing card · expires {card.expires_on}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Study year
                <select
                  value={studyYear}
                  onChange={(event) => {
                    setStudyYear(event.target.value as 'first' | 'second');
                    setSavedPdfUrl('');
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold normal-case text-slate-900"
                >
                  <option value="first">First year</option>
                  <option value="second">Second year</option>
                </select>
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Expiry date</p>
                <p className="mt-1 text-sm font-black text-slate-900">{expiryDate(expiryYear)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Student ID photo</p>
                  <p className="mt-1 text-xs text-slate-600">JPEG, PNG, or WebP; maximum 6 MB.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  {photoFile ? 'Replace photo' : 'Add photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoChange} />
                </label>
              </div>
              {photoLoadError && <p className="mt-2 text-xs text-amber-700">The saved photo could not be loaded. Upload a replacement to continue.</p>}
              {photoPreviewUrl && <p className="mt-2 text-xs font-semibold text-emerald-700">{photoFile ? 'New photo selected.' : 'Saved ID photo loaded.'}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center shadow-inner">
              <CreditCard className="mx-auto h-8 w-8 text-blue-700" />
              <p className="mt-2 text-sm font-bold text-slate-900">Preview the finished card before issuing it.</p>
              <p className="mt-1 text-xs text-slate-600">The preview includes the student photo, barcode, study months, and expiry date.</p>
            </div>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              Preview ID card
            </button>
          </div>
        </section>
      )}

      {cropOpen && cropImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="photo-crop-title" className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="photo-crop-title" className="text-lg font-black text-slate-950">Crop student photo</h2>
                <p className="mt-1 text-sm text-slate-600">Move the photo and adjust zoom to fit the 17:18 card photo frame.</p>
              </div>
              <button type="button" onClick={cancelPhotoCrop} disabled={cropSaving} aria-label="Cancel photo crop" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mt-4 h-[min(60vh,420px)] overflow-hidden rounded-xl bg-slate-950">
              <Cropper
                image={cropImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={17 / 18}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedArea(area)}
              />
            </div>
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-2 w-full accent-blue-700"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={cancelPhotoCrop} disabled={cropSaving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleCropAndUsePhoto} disabled={cropSaving || !croppedArea} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                {cropSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Apply crop
              </button>
            </div>
          </section>
        </div>
      )}

      {previewOpen && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="card-preview-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="card-preview-title" className="text-lg font-black text-slate-950">Student ID card preview</h2>
                <p className="mt-1 text-sm text-slate-600">Review this card before generating or printing its PDF.</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} disabled={cardSaving} aria-label="Close card preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner">
              <div
                ref={cardElement}
                className="relative isolate mx-auto flex flex-col overflow-hidden rounded-[3mm] text-slate-900 shadow-xl"
                style={{
                  boxSizing: 'border-box',
                  width: `${CARD_WIDTH_MM}mm`,
                  height: `${CARD_HEIGHT_MM}mm`,
                  padding: '8mm 2.8mm 2.8mm',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef4fa 100%)',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                <div aria-hidden className="pointer-events-none absolute inset-[-20%] z-0 rotate-[-18deg] opacity-[0.02]" style={{ backgroundImage: 'url("/emit-academy-mark.svg")', backgroundRepeat: 'repeat', backgroundSize: '14mm 12mm' }} />
                <div className="absolute inset-x-0 top-0 z-20 h-[1.3mm] bg-gradient-to-r from-blue-950 via-blue-700 to-amber-500" />
                <div className="relative z-10 flex h-[7mm] items-center justify-center pb-[1mm]">
                  <div className="flex items-center gap-[1.5mm]">
                    <Image src="/emit-academy-mark.svg" width={30} height={30} alt="Emit Academy logo" priority className="h-[8mm] w-[8mm] object-contain" />
                    <div className="leading-tight text-center">
                      <p className="text-[7pt] font-black tracking-[0.08em] text-blue-950">EMIT ACADEMY</p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex h-[27mm] items-center gap-[2mm] py-[1.5mm]">
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <p className="max-h-[6mm] overflow-hidden text-[8pt] font-black leading-tight text-blue-950">{student.name}</p>
                    <svg ref={barcodeElement} className="mt-[1mm] h-[9mm] w-[48mm] max-w-full" aria-label={`Code 128 barcode for student ID ${student.student_id}`} />
                    {barcodeError && <p className="mt-[0.5mm] text-[4pt] font-bold text-rose-700">{barcodeError}</p>}
                    <p className="mt-[0.8mm] text-[9pt] font-black leading-none tracking-[0.06em] text-blue-950">{student.student_id}</p>
                  </div>
                  <div className="flex w-[20mm] flex-none flex-col items-center">
                    <div className="relative h-[18mm] w-[17mm] overflow-hidden rounded-[1.5mm] border border-slate-300 bg-slate-200">
                      {photoPreviewUrl ? (
                        <Image src={photoPreviewUrl} alt={`${student.name} ID photo`} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[5pt] font-bold uppercase text-slate-500">ID photo</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 space-y-[0.7mm]">
                  {[0, 1].map((row) => (
                    <div key={row} className="grid grid-cols-[7.2mm_repeat(10,minmax(0,1fr))]">
                      <span className="py-[0.5mm] text-center text-[3.5pt] font-black leading-none text-slate-700">
                        {expiryYear || '----'}
                      </span>
                      {MONTHS.map((month) => (
                        <span key={month} className={`py-[0.5mm] text-center text-[3.5pt] font-black leading-none ${row === 0 ? 'text-red-700' : 'text-blue-700'}`}>
                          {month}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="relative z-10 mt-auto pb-[0.9mm] text-center text-[4pt] font-bold text-slate-600">Expires {expiryDate(expiryYear)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-nowrap justify-end gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={handleGenerateAndSave}
                disabled={cardSaving || settingsDirty || !expiryYear || (!photoFile && !canReusePhoto) || barcodeReadyFor !== student.student_id || Boolean(barcodeError)}
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cardSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Generate &amp; save PDF
              </button>
              {savedPdfUrl ? (
                <>
                  <a href={savedPdfUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                    <Printer className="h-4 w-4" />
                    Open PDF to print
                  </a>
                  <a href={savedPdfUrl} download={`Rhema-ID-${student.student_id}.pdf`} className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                </>
              ) : (
                <>
                  <button type="button" disabled className="inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-400 opacity-60">
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button type="button" disabled className="inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-400 opacity-60">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </>
              )}
            </div>
            {message && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-3 rounded-xl px-4 py-3 text-sm ${messageIsError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}
              >
                {message}
              </p>
            )}
          </section>
        </div>
      )}

      {message && !previewOpen && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${messageIsError ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
