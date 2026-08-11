/*
* ONE IDENTITY LLC. PROPRIETARY INFORMATION
*
* This software is confidential. One Identity, LLC. or one of its affiliates or
* subsidiaries, has supplied this software to you under terms of a
* license agreement, nondisclosure agreement or both.
*
* You may not copy, disclose, or use this software except in accordance with
* those terms.
*
* Copyright 2025 One Identity LLC.
* ALL RIGHTS RESERVED.
*
* ONE IDENTITY LLC. MAKES NO REPRESENTATIONS OR
* WARRANTIES ABOUT THE SUITABILITY OF THE SOFTWARE,
* EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
* TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE, OR
* NON-INFRINGEMENT. ONE IDENTITY LLC. SHALL NOT BE
* LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE
* AS A RESULT OF USING, MODIFYING OR DISTRIBUTING
* THIS SOFTWARE OR ITS DERIVATIVES.
*/

import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';

import { ClassloggerService } from '../../classlogger/classlogger.service';
import { FileSelectorService } from '../../file-selector/file-selector.service';
import { Base64ImageService } from '../../images/base64-image.service';
import {
  CdrEditor,
  ValueHasChangedEventArg,
} from '../cdr-editor.interface';
import { ColumnDependentReference } from '../column-dependent-reference.interface';
import { EntityColumnContainer } from '../entity-column-container';

/**
* Provides a CDR editor for editing and viewing image data columns.
*
* Selected PNG and JPEG images are centre-cropped and resized
* to exactly 945 x 710 pixels before being saved. 
*/
@Component({
  selector: 'imx-edit-image',
  templateUrl: './edit-image.component.html',
  styleUrls: ['./edit-image.component.scss'],
  standalone: false,
  providers: [FileSelectorService],
})
export class EditImageComponent implements CdrEditor, OnDestroy {
  /**
   * Access to the file input from the template.
   */
  @ViewChild('file') public fileInput: ElementRef<HTMLInputElement>;

  /**
   * Gets a hint when the selected file format is not supported.
   */
  public get fileFormatHint(): string | undefined {
    if (this.fileFormatError) {
      return '#LDS#Please select an image in PNG or JPEG format.';
    }

    return undefined;
  }

  /**
   * A subject for triggering an update of the editor.
   */
  public readonly updateRequested = new Subject<void>();

  /**
   * The form control associated with the editor.
   */
  public readonly control = new UntypedFormControl(undefined);

  /**
   * The container that wraps the column functionality.
   */
  public readonly columnContainer = new EntityColumnContainer<string>();

  /**
   * Event emitted after a value has changed.
   */
  public readonly valueHasChanged =
    new EventEmitter<ValueHasChangedEventArg>();

  /**
   * Indicator that the component is loading data from the server.
   */
  public isLoading = false;

  private fileFormatError = false;

  // Fixed dimensions of the saved image. 
  private readonly targetImageWidth = 710; 
  private readonly targetImageHeight = 945; 

  private readonly subscriptions: Subscription[] = [];
  private isWriting = false;

  constructor(
    private readonly logger: ClassloggerService,
    private readonly imageProvider: Base64ImageService,
    private readonly fileSelector: FileSelectorService,
  ) {
    this.subscriptions.push(
      this.fileSelector.fileFormatError.subscribe(() => {
        this.fileFormatError = true;
      }),

      this.fileSelector.fileSelected.subscribe((filepath) =>
        this.writeValue(this.imageProvider.getImageData(filepath)),
      ),
    );
  }

  /**
   * Unsubscribes all events after the OnDestroy hook is triggered.
   */
  public ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) =>
      subscription.unsubscribe(),
    );
  }

  /**
   * Binds a column dependent reference to the component.
   *
   * @param cdref A column dependent reference.
   */
  public bind(cdref: ColumnDependentReference): void {
    if (cdref && cdref.column) {
      this.columnContainer.init(cdref);

      this.control.setValue(this.columnContainer.value, {
        emitEvent: false,
      });

      if (
        this.columnContainer.isValueRequired &&
        this.columnContainer.canEdit
      ) {
        this.control.setValidators(Validators.required);
      }

      if (cdref.minlengthSubject) {
        this.subscriptions.push(
          cdref.minlengthSubject.subscribe(() => {
            this.setValidators();
          }),
        );
      }

      this.subscriptions.push(
        this.columnContainer.subscribe(() => {
          if (this.isWriting) {
            return;
          }

          if (this.control.value !== this.columnContainer.value) {
            this.logger.trace(this, 'Control set to new value');

            this.control.setValue(this.columnContainer.value, {
              emitEvent: false,
            });
          }

          this.valueHasChanged.emit({
            value: this.control.value,
          });
        }),
      );

      this.subscriptions.push(
        this.updateRequested.subscribe(() => {
          setTimeout(() => {
            if (this.control.value !== this.columnContainer.value) {
              this.logger.trace(this, 'Control set to new value');

              this.control.setValue(this.columnContainer.value, {
                emitEvent: false,
              });
            }

            this.valueHasChanged.emit({
              value: this.control.value,
            });

            this.setValidators();

            this.control.updateValueAndValidity({
              onlySelf: true,
              emitEvent: false,
            });
          });
        }),
      );
    }
  }

  /**
   * Resets the file-format error.
   */
  public resetFileFormatErrorState(): void {
    this.fileFormatError = false;
  }

  /**
   * Validates, centre-crops and resizes a selected PNG or JPEG image.
   *
   * The saved image is always exactly 710 x 945 pixels.
   * Smaller images are enlarged.
   *
   * @param fileList The selected files.
   */
  public async emitFiles(fileList: FileList | null): Promise<void> { 
    if (!fileList || fileList.length === 0) {
      return;
    }

    const file = fileList[0];
    const allowedTypes = ['image/png', 'image/jpeg']; 
    this.fileFormatError = false;

    if (!allowedTypes.includes(file.type)) { 
      this.fileFormatError = true;
      this.clearFileInput(); 
      return;
    }

    let image: ImageBitmap | undefined; 

    try {
      image = await createImageBitmap(file); 
      const croppedImage = this.cropImage(
        image,
        this.targetImageWidth,
        this.targetImageHeight,
        file.type,
      ); 
      await this.writeValue(
        this.imageProvider.getImageData(croppedImage),
      ); 
    } catch (error) {
      this.logger.error(
        this,
        'Unable to process the selected image.',
        error,
      ); 

      this.fileFormatError = true;
      this.clearFileInput(); 
    } finally {
      if (image) {
        image.close(); 
      }
    }
  }

  /**
   * Removes the current image and writes an empty value to the column.
   */
  public async remove(): Promise<void> {
    this.clearFileInput(); 

    this.fileFormatError = false;

    this.logger.debug(this, 'Removing current image...');

    await this.writeValue(undefined);
  }

  private cropImage( 
    image: ImageBitmap,
    targetWidth: number,
    targetHeight: number,
    mimeType: string,
  ): string {
    const canvas = document.createElement('canvas'); 

    canvas.width = targetWidth; 
    canvas.height = targetHeight; 

    const context = canvas.getContext('2d'); 

    if (!context) {
      throw new Error('Unable to create an image canvas.'); 
    }

    const sourceAspectRatio = image.width / image.height; 
    const targetAspectRatio = targetWidth / targetHeight; 

    let sourceX = 0; 
    let sourceY = 0; 
    let sourceWidth = image.width; 
    let sourceHeight = image.height; 

    if (sourceAspectRatio > targetAspectRatio) {
      sourceWidth = image.height * targetAspectRatio; 
      sourceX = (image.width - sourceWidth) / 2; 
    } else if (sourceAspectRatio < targetAspectRatio) {
      sourceHeight = image.width / targetAspectRatio; 
      sourceY = (image.height - sourceHeight) / 2; 
    }

    /*
     * Draw the selected source area into a 710 x 945 canvas.
     * Canvas automatically enlarges or reduces the source image.
     */ 
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    ); 

    /*
     * Preserve JPEG as JPEG and PNG as PNG.
     */ 
    if (mimeType === 'image/jpeg') {
      return canvas.toDataURL('image/jpeg', 0.9); 
    }

    return canvas.toDataURL('image/png'); 
  }

  /**
   * Clears the selected file from the file input.
   */
  private clearFileInput(): void { 
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = ''; 
    }
  }

  /**
   * Sets Validators.required if the control is mandatory.
   */
  private setValidators(): void {
    if (
      this.columnContainer.isValueRequired &&
      this.columnContainer.canEdit
    ) {
      this.control.setValidators(Validators.required);
    } else {
      this.control.setValidators(null);
    }
  }

  /**
   * Updates the value for the CDR.
   *
   * @param value The image value to write.
   */
  private async writeValue(
    value: string | undefined,
  ): Promise<void> {
    this.logger.debug(
      this,
      'writeValue called with value',
      value,
    );

    if (
      !this.columnContainer.canEdit ||
      this.columnContainer.value === value
    ) {
      return;
    }

    this.control.setValue(value, {
      emitEvent: false,
    });

    try {
      this.isLoading = true;
      this.isWriting = true;

      this.logger.debug(
        this,
        'writeValue - updateCdrValue...',
      );

      await this.columnContainer.updateValue(value);
    } catch (error) {
      this.logger.error(this, error);
    } finally {
      this.isLoading = false;
      this.isWriting = false;

      if (this.control.value !== this.columnContainer.value) {
        this.control.setValue(this.columnContainer.value, {
          emitEvent: false,
        });

        this.logger.debug(
          this,
          'form control value is set to',
          this.control.value,
        );
      }

      this.valueHasChanged.emit({
        value: this.control.value,
        forceEmit: true,
      });
    }

    this.control.markAsDirty();
  }
}