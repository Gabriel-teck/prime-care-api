import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private contact: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit contact form (public)' })
  submit(@Body() dto: ContactDto) {
    return this.contact.submit(dto);
  }
}
